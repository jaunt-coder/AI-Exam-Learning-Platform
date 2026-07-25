"""Stage 6.8 — Semantic Validation Engine (pure, read-only).

Validates that the geometry-restored AST also satisfies accounting-meaning
constraints. This stage NEVER mutates Row/Column/Cell membership or Token
text — it only scores and records violations.

Mutating repairs live in Stage 6.7 (`semantic_repair.py`) and must run first.

Rules are GENERAL (header/token/type patterns). Forbidden:
    year == …, questionId == …, page == …, question number hardcoding.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Protocol

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import QuestionCandidate, TableCandidate, Token, TokenType

# Backward-compatible re-exports + shared helper (canonical home: semantic_repair.py).
from semantic_repair import (  # noqa: E402
    _nearest_number_cell,
    prune_degenerate_tables,
    repair_orphan_units,
)

# --- header / unit vocabularies (accounting classes, not question ids) -----
YEAR_CELL_RE = re.compile(
    r"^20\s*[×xX]\s*\d{1,2}(?:\s*년)?(?:말|초|도|기)?$"
)
YEAR_TOKEN_RE = re.compile(r"20[×xX]\d{1,2}")
PERCENT_CELL_RE = re.compile(r"^\d+(?:\.\d+)?\s*%$")
NUMBER_RE = re.compile(r"\d")

PV_HEADERS = ("현재가치", "정상연금", "복리", "현가", "단일금액")
TOTAL_HEADERS = ("합계", "총계", "기말", "기초", "당기", "전기", "소계")
DEBIT_CREDIT = ("차변", "대변")
ORPHAN_UNITS = frozenset({"￦", "W", "₩", "원", "주", "%", "％", "좌", "계약"})
CHOICE_GLYPHS = "①②③④⑤"


@dataclass
class SemanticViolation:
    rule: str
    severity: str          # "error" | "warn"
    message: str
    question_number: int | None = None
    table_index: int | None = None
    detail: dict = field(default_factory=dict)


@dataclass
class SemanticReport:
    """Per-question semantic validation result."""

    question_number: int | None
    score: float = 100.0                 # 0..100
    violations: list[SemanticViolation] = field(default_factory=list)
    blank_cell_ratio: float = 0.0
    orphan_token_count: int = 0
    header_ok: bool = True
    numeric_context_ok: bool = True
    table_consistency: float = 1.0
    choice_ok: bool = True
    has_table: bool = False

    def as_dict(self) -> dict:
        return {
            "questionNumber": self.question_number,
            "score": round(self.score, 2),
            "violations": [
                {
                    "rule": v.rule,
                    "severity": v.severity,
                    "message": v.message,
                    "tableIndex": v.table_index,
                    "detail": v.detail,
                }
                for v in self.violations
            ],
            "blankCellRatio": round(self.blank_cell_ratio, 4),
            "orphanTokenCount": self.orphan_token_count,
            "headerOk": self.header_ok,
            "numericContextOk": self.numeric_context_ok,
            "tableConsistency": round(self.table_consistency, 4),
            "choiceOk": self.choice_ok,
            "hasTable": self.has_table,
        }


class SemanticRule(Protocol):
    name: str

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]: ...


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _grid(table: TableCandidate) -> list[list[str]]:
    return [[str(c).strip() if c is not None else "" for c in row] for row in table.rows]


def _cell_has_number(text: str) -> bool:
    return bool(NUMBER_RE.search(text or ""))


def _is_year_cell(text: str) -> bool:
    t = (text or "").replace(" ", "")
    return bool(YEAR_CELL_RE.match(t)) or bool(YEAR_TOKEN_RE.fullmatch(t))


def _is_percent_cell(text: str) -> bool:
    return bool(PERCENT_CELL_RE.match((text or "").replace(" ", "")))


def _cell_has_amount(text: str) -> bool:
    """True if cell carries a numeric *value* (not a year label alone)."""
    if not _cell_has_number(text):
        return False
    if _is_year_cell(text):
        return False
    return True


def _row_has_number(row: list[str]) -> bool:
    return any(_cell_has_amount(c) for c in row)


def _col_has_number(grid: list[list[str]], col: int, start_row: int = 0) -> bool:
    for r in range(start_row, len(grid)):
        if col < len(grid[r]) and _cell_has_amount(grid[r][col]):
            return True
    return False


def _col_has_number_nearby(
    grid: list[list[str]], col: int, start_row: int = 0, slack: int = 1
) -> bool:
    """Amount in this column or an adjacent column (OCR column drift tolerance)."""
    ncols = max((len(r) for r in grid), default=0)
    for c in range(max(0, col - slack), min(ncols, col + slack + 1)):
        if _col_has_number(grid, c, start_row=start_row):
            return True
    return False


def _contains_any(text: str, needles: tuple[str, ...] | list[str]) -> bool:
    return any(n in (text or "") for n in needles)


def _is_total_header_cell(text: str) -> bool:
    """합계/총계/기말… 헤더. '과소계상'·'당기순이익' 같은 일반 적요는 제외."""
    t = (text or "").strip()
    if not t:
        return False
    if t in TOTAL_HEADERS:
        return True
    # 합계/총계/소계 as whole-word-ish (not mid-compound like 과소계상)
    for h in ("합계", "총계", "소계"):
        if t == h or t.startswith(h + " ") or t.endswith(h) and len(t) <= len(h) + 2:
            return True
        if t.startswith(h) and len(t) <= len(h) + 3:
            return True
    # 기말/기초/당기/전기 alone or very short label (기말액) — not long line items
    for h in ("기말", "기초", "당기", "전기"):
        if t == h or t in {h + "액", h + "잔액", h + "잔고"}:
            return True
    return False


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------
class YearHeaderRule:
    """연도 헤더 행/열에는 금액성 숫자가 동반되어야 한다.

    - 한 행에 연도 헤더가 2개 이상이면(연도 비교표) 각 열/행에 금액 필요
    - 단독 연도 언급은 표 전체에 금액이 있으면 통과(본문 연도 인용)
    """

    name = "YearHeaderRule"

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]:
        out: list[SemanticViolation] = []
        for ti, table in enumerate(cand.tables or ([cand.table] if cand.table else [])):
            if not table:
                continue
            grid = _grid(table)
            table_has_amount = any(_cell_has_amount(c) for row in grid for c in row)
            for ri, row in enumerate(grid):
                year_cols = [ci for ci, cell in enumerate(row) if _is_year_cell(cell)]
                if not year_cols:
                    continue
                multi = len(year_cols) >= 2
                for ci in year_cols:
                    cell = row[ci]
                    same_row = _row_has_number(row)
                    same_col = _col_has_number_nearby(grid, ci, start_row=ri)
                    if multi:
                        if not same_row and not same_col:
                            out.append(SemanticViolation(
                                rule=self.name, severity="error",
                                message="연도 헤더에 대응하는 숫자 행/열이 없음",
                                question_number=cand.number, table_index=ti,
                                detail={"row": ri, "col": ci, "cell": cell},
                            ))
                    else:
                        if not table_has_amount and not same_row and not same_col:
                            out.append(SemanticViolation(
                                rule=self.name, severity="error",
                                message="연도 헤더가 있으나 표 내 금액 숫자가 없음",
                                question_number=cand.number, table_index=ti,
                                detail={"row": ri, "col": ci, "cell": cell},
                            ))
        return out


class PresentValueTableRule:
    """현가/연금/복리 헤더가 있으면 표 내부에 숫자가 있어야 한다."""

    name = "PresentValueTableRule"

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]:
        out: list[SemanticViolation] = []
        for ti, table in enumerate(cand.tables or ([cand.table] if cand.table else [])):
            if not table:
                continue
            grid = _grid(table)
            flat = " ".join(c for row in grid for c in row)
            if not _contains_any(flat, PV_HEADERS):
                continue
            if not any(_cell_has_number(c) for row in grid for c in row):
                out.append(SemanticViolation(
                    rule=self.name, severity="error",
                    message="현가계수/연금 헤더가 있으나 표 내 숫자가 없음",
                    question_number=cand.number, table_index=ti,
                ))
        return out


class DebitCreditRule:
    """차변·대변 헤더가 함께 있으면 최소 2열 구조여야 한다."""

    name = "DebitCreditRule"

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]:
        out: list[SemanticViolation] = []
        for ti, table in enumerate(cand.tables or ([cand.table] if cand.table else [])):
            if not table:
                continue
            flat = " ".join(c for row in _grid(table) for c in row)
            has_debit = "차변" in flat
            has_credit = "대변" in flat
            if has_debit and has_credit and table.n_cols < 2:
                out.append(SemanticViolation(
                    rule=self.name, severity="error",
                    message="차변/대변이 있으나 2열 구조가 아님",
                    question_number=cand.number, table_index=ti,
                    detail={"nCols": table.n_cols},
                ))
        return out


class ChoiceCountRule:
    """①~⑤ 마커가 있으면 Choice는 정확히 5개여야 한다."""

    name = "ChoiceCountRule"

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]:
        markers = [t for t in cand.tokens if t.type == TokenType.CHOICE_MARKER]
        if not markers:
            # also accept marker glyphs in choice objects
            if not cand.choices:
                return []
        idxs = {c.index for c in cand.choices if c.index and 1 <= c.index <= 5}
        # Only enforce when we saw choice markers in the question tokens
        if not markers and not idxs:
            return []
        if len(idxs) != 5:
            return [SemanticViolation(
                rule=self.name, severity="error",
                message=f"보기 개수 불일치 (expected 5, got {len(idxs)})",
                question_number=cand.number,
                detail={"indices": sorted(idxs), "markerCount": len(markers)},
            )]
        return []


class TotalHeaderRule:
    """합계/총계/기말/기초/당기/전기 헤더 행에는 같은 행 또는 다음 행에 숫자가 있어야 한다."""

    name = "TotalHeaderRule"

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]:
        out: list[SemanticViolation] = []
        for ti, table in enumerate(cand.tables or ([cand.table] if cand.table else [])):
            if not table:
                continue
            grid = _grid(table)
            for ri, row in enumerate(grid):
                for ci, cell in enumerate(row):
                    if not _is_total_header_cell(cell):
                        continue
                    if _cell_has_number(cell):
                        continue
                    same = _row_has_number(row)
                    nxt = ri + 1 < len(grid) and _row_has_number(grid[ri + 1])
                    same_col = _col_has_number(grid, ci, start_row=ri)
                    if not (same or nxt or same_col):
                        out.append(SemanticViolation(
                            rule=self.name, severity="error",
                            message="합계/기말 등 헤더에 대응하는 숫자가 없음",
                            question_number=cand.number, table_index=ti,
                            detail={"row": ri, "col": ci, "cell": cell},
                        ))
        return out


class PercentHeaderRule:
    """퍼센트 *헤더*(상단 밴드) 셀이 있으면 같은 열 아래에 숫자 값이 있어야 한다.

    표 하단에 있는 10%/60% 같은 데이터 값은 헤더로 보지 않는다.
    """

    name = "PercentHeaderRule"

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]:
        out: list[SemanticViolation] = []
        for ti, table in enumerate(cand.tables or ([cand.table] if cand.table else [])):
            if not table:
                continue
            grid = _grid(table)
            if not grid:
                continue
            header_band = max(1, min(2, len(grid) // 3 + 1))
            for ri, row in enumerate(grid):
                if ri >= header_band:
                    continue
                for ci, cell in enumerate(row):
                    if not _is_percent_cell(cell):
                        continue
                    below = _col_has_number(grid, ci, start_row=ri + 1)
                    same_row_num = any(
                        _cell_has_number(row[j]) and not _is_percent_cell(row[j])
                        for j in range(len(row)) if j != ci
                    )
                    if below or same_row_num:
                        continue
                    # any numeric data elsewhere in the table under this col family
                    if not any(_cell_has_number(c) for r in grid[ri + 1:] for c in r):
                        out.append(SemanticViolation(
                            rule=self.name, severity="error",
                            message="퍼센트 헤더가 있으나 표 내 숫자 값이 없음",
                            question_number=cand.number, table_index=ti,
                            detail={"row": ri, "col": ci, "cell": cell},
                        ))
                    elif not below:
                        out.append(SemanticViolation(
                            rule=self.name, severity="error",
                            message="퍼센트 헤더 열 아래에 숫자 값이 없음",
                            question_number=cand.number, table_index=ti,
                            detail={"row": ri, "col": ci, "cell": cell},
                        ))
        return out


class OrphanUnitRule:
    """￦/원/주/% 단독 셀은 금지 — Number와 연결되어야 한다.

    주변에 숫자가 전혀 없으면(파편화된 한글 음절 '주' 등) warn으로 낮춘다.
    """

    name = "OrphanUnitRule"

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]:
        out: list[SemanticViolation] = []
        for ti, table in enumerate(cand.tables or ([cand.table] if cand.table else [])):
            if not table:
                continue
            grid = _grid(table)
            table_has_num = any(_cell_has_number(c) for row in grid for c in row)
            for ri, row in enumerate(grid):
                for ci, cell in enumerate(row):
                    t = cell.strip()
                    if t not in ORPHAN_UNITS:
                        continue
                    near = _nearest_number_cell(grid, ri, ci, max_dist=2)
                    if near is None:
                        # no attachable number — likely Hangul fragment, not a true unit
                        if table_has_num and t == "주":
                            severity = "warn"
                            msg = f"단독 음절 '{t}' (단위/파편 불명)"
                        elif not table_has_num:
                            severity = "warn"
                            msg = f"단독 단위 셀 '{t}' (표 내 숫자 없음)"
                        else:
                            severity = "error"
                            msg = f"단독 단위 셀 '{t}' (숫자와 미연결)"
                    else:
                        severity = "error"
                        msg = f"단독 단위 셀 '{t}' (숫자와 미연결)"
                    out.append(SemanticViolation(
                        rule=self.name, severity=severity, message=msg,
                        question_number=cand.number, table_index=ti,
                        detail={"row": ri, "col": ci, "cell": t},
                    ))
        return out


class BlankCellRule:
    """Blank cell ratio를 기록한다 (고비율은 warn)."""

    name = "BlankCellRule"
    WARN_RATIO = 0.75

    def check(self, cand: QuestionCandidate) -> list[SemanticViolation]:
        out: list[SemanticViolation] = []
        for ti, table in enumerate(cand.tables or ([cand.table] if cand.table else [])):
            if not table or not table.rows:
                continue
            grid = _grid(table)
            total = sum(len(r) for r in grid)
            if total == 0:
                continue
            blank = sum(1 for r in grid for c in r if not c.strip())
            ratio = blank / total
            if ratio >= self.WARN_RATIO and table.n_rows >= 2:
                out.append(SemanticViolation(
                    rule=self.name, severity="warn",
                    message=f"빈 셀 비율이 높음 ({ratio:.0%})",
                    question_number=cand.number, table_index=ti,
                    detail={"blank": blank, "total": total, "ratio": round(ratio, 4)},
                ))
        return out


DEFAULT_RULES: list[SemanticRule] = [
    YearHeaderRule(),
    PresentValueTableRule(),
    DebitCreditRule(),
    ChoiceCountRule(),
    TotalHeaderRule(),
    PercentHeaderRule(),
    OrphanUnitRule(),
    BlankCellRule(),
]


# ---------------------------------------------------------------------------
# scoring
# ---------------------------------------------------------------------------
ERROR_PENALTY = 12.0
WARN_PENALTY = 3.0


def _blank_ratio(cand: QuestionCandidate) -> float:
    tables = cand.tables or ([cand.table] if cand.table else [])
    total = blank = 0
    for table in tables:
        if not table:
            continue
        grid = _grid(table)
        total += sum(len(r) for r in grid)
        blank += sum(1 for r in grid for c in r if not c.strip())
    return (blank / total) if total else 0.0


def _orphan_count(violations: list[SemanticViolation]) -> int:
    return sum(1 for v in violations if v.rule == "OrphanUnitRule")


def _table_consistency(cand: QuestionCandidate, violations: list[SemanticViolation]) -> float:
    tables = cand.tables or ([cand.table] if cand.table else [])
    if not tables:
        return 1.0
    table_rules = {
        "YearHeaderRule", "PresentValueTableRule", "DebitCreditRule",
        "TotalHeaderRule", "PercentHeaderRule", "OrphanUnitRule",
    }
    errors = sum(1 for v in violations if v.severity == "error" and v.rule in table_rules)
    # each table starts at 1.0; decay with errors
    return max(0.0, 1.0 - 0.15 * errors)


def score_question(
    cand: QuestionCandidate,
    rules: list[SemanticRule] | None = None,
) -> SemanticReport:
    rules = rules or DEFAULT_RULES
    violations: list[SemanticViolation] = []
    for rule in rules:
        violations.extend(rule.check(cand))

    score = 100.0
    for v in violations:
        score -= ERROR_PENALTY if v.severity == "error" else WARN_PENALTY
    score = max(0.0, min(100.0, score))

    header_rules = {"YearHeaderRule", "PresentValueTableRule", "TotalHeaderRule", "PercentHeaderRule"}
    header_ok = not any(v.rule in header_rules and v.severity == "error" for v in violations)
    numeric_ok = not any(
        v.rule in {"YearHeaderRule", "PresentValueTableRule", "TotalHeaderRule", "PercentHeaderRule"}
        and v.severity == "error" for v in violations
    )
    choice_ok = not any(v.rule == "ChoiceCountRule" for v in violations)
    has_table = bool(cand.table or cand.tables)

    return SemanticReport(
        question_number=cand.number,
        score=score,
        violations=violations,
        blank_cell_ratio=_blank_ratio(cand),
        orphan_token_count=_orphan_count(violations),
        header_ok=header_ok,
        numeric_context_ok=numeric_ok,
        table_consistency=_table_consistency(cand, violations),
        choice_ok=choice_ok,
        has_table=has_table,
    )


class SemanticValidator:
    """Stage 6.8 pipeline adapter — pure read-only validation (no AST mutation)."""

    name = "SemanticValidator"

    def __init__(self, config: ParserConfig | None = None, rules: list[SemanticRule] | None = None):
        self.config = config or DEFAULT_CONFIG
        self.rules = rules or list(DEFAULT_RULES)

    def run(self, ctx: ParseContext) -> ParseContext:
        if not ctx.questions:
            ctx.add(self.name, "warn", "no questions")
            return ctx

        reports: list[SemanticReport] = []
        all_violations: list[SemanticViolation] = []
        for cand in ctx.questions:
            report = score_question(cand, self.rules)
            cand.semantic = report
            reports.append(report)
            all_violations.extend(report.violations)

        scores = [r.score for r in reports]
        doc_score = sum(scores) / len(scores) if scores else 0.0
        table_reports = [r for r in reports if r.has_table]
        table_score = (
            sum(r.score for r in table_reports) / len(table_reports) if table_reports else None
        )
        errors = [v for v in all_violations if v.severity == "error"]
        warns = [v for v in all_violations if v.severity == "warn"]
        orphans = sum(r.orphan_token_count for r in reports)
        blank_vals = [r.blank_cell_ratio for r in table_reports] if table_reports else []
        repair_meta = getattr(ctx, "meta_repair", None) or {}

        ctx.meta_semantic = {
            "documentScore": round(doc_score, 2),
            "tableScore": None if table_score is None else round(table_score, 2),
            "questionCount": len(reports),
            "tableQuestionCount": len(table_reports),
            # Repair counts come from Stage 6.7 (reported here for continuity).
            "orphanRepairs": repair_meta.get("orphanRepairs", 0),
            "degenerateTablesPruned": repair_meta.get("degenerateTablesPruned", 0),
            "violationCount": len(all_violations),
            "errorCount": len(errors),
            "warnCount": len(warns),
            "orphanTokenCount": orphans,
            "blankCellRatioMean": (
                round(sum(blank_vals) / len(blank_vals), 4) if blank_vals else 0.0
            ),
            "headerValidationAccuracy": (
                round(sum(1 for r in reports if r.header_ok) / len(reports), 4) if reports else 0.0
            ),
            "numericContextAccuracy": (
                round(sum(1 for r in reports if r.numeric_context_ok) / len(reports), 4)
                if reports else 0.0
            ),
            "tableConsistencyMean": (
                round(sum(r.table_consistency for r in table_reports) / len(table_reports), 4)
                if table_reports else 1.0
            ),
            "choiceAccuracy": (
                round(sum(1 for r in reports if r.choice_ok) / len(reports), 4) if reports else 0.0
            ),
            "violations": [
                {
                    "rule": v.rule,
                    "severity": v.severity,
                    "message": v.message,
                    "questionNumber": v.question_number,
                    "tableIndex": v.table_index,
                    "detail": v.detail,
                }
                for v in all_violations
            ],
        }
        ctx.semantic_reports = reports
        ctx.add(
            self.name,
            "info",
            f"semantic score={doc_score:.1f} · errors={len(errors)} · warns={len(warns)} · "
            f"orphans={orphans} · tables={len(table_reports)}",
        )
        return ctx
