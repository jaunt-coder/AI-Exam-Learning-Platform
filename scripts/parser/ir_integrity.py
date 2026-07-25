"""Stage 6.9 — IR Integrity Gate (Freeze).

Structural / provenance invariants that must hold before any Codegen (Builder).
This stage NEVER mutates the AST. On hard failure it records diagnostics at
error level so the pipeline (and future Builder) will not emit JSON.

Checks (general rules only — no questionId / year hardcoding):
    1. Token partition   — stem ∪ choices == question.tokens (exact cover)
    2. Immutable seal    — IMMUTABLE_TYPES keep immutable=True; flag matches type
    3. Structure         — expected ACC count, unique numbers, choice count when marked
    4. Table shape       — rectangular rows; cell_tokens shape matches when present
    5. Emit-ready        — number present; surface strings reconstructible
    6. Semantic gate     — Stage 6.8 errorCount must be 0 (if reports present)
    7. Freeze            — ctx.ir_frozen = True only when all hard checks pass

Forbidden:
    year == …, questionId == …, page == …, question-number hardcoding in rules.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import (
    IMMUTABLE_TYPES,
    QuestionCandidate,
    Token,
    TokenType,
)

CHOICE_GLYPHS = "①②③④⑤"


@dataclass
class IntegrityViolation:
    check: str
    severity: str  # "error" | "warn"
    message: str
    question_number: int | None = None
    detail: dict = field(default_factory=dict)


@dataclass
class IntegrityReport:
    """Per-question IR integrity result."""

    question_number: int | None
    passed: bool = True
    violations: list[IntegrityViolation] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "questionNumber": self.question_number,
            "passed": self.passed,
            "violations": [
                {
                    "check": v.check,
                    "severity": v.severity,
                    "message": v.message,
                    "detail": v.detail,
                }
                for v in self.violations
            ],
        }


def _token_key(tok: Token) -> tuple:
    """Stable identity for partition checks (object id preferred when shared)."""
    return id(tok)


def _check_token_partition(cand: QuestionCandidate) -> list[IntegrityViolation]:
    out: list[IntegrityViolation] = []
    owned = [_token_key(t) for t in cand.tokens]
    owned_set = set(owned)
    if len(owned) != len(owned_set):
        out.append(
            IntegrityViolation(
                check="TokenPartition",
                severity="error",
                message="question.tokens contains duplicate token object identities",
                question_number=cand.number,
            )
        )

    stem_keys = [_token_key(t) for t in (cand.stem_tokens or [])]
    choice_keys: list = []
    for ch in cand.choices or []:
        choice_keys.extend(_token_key(t) for t in (ch.tokens or []))

    parts = stem_keys + choice_keys
    part_set = set(parts)
    if len(parts) != len(part_set):
        out.append(
            IntegrityViolation(
                check="TokenPartition",
                severity="error",
                message="stem/choice token sets overlap or duplicate identities",
                question_number=cand.number,
                detail={"stem": len(stem_keys), "choiceTokens": len(choice_keys)},
            )
        )

    missing = owned_set - part_set
    extra = part_set - owned_set
    if missing or extra:
        out.append(
            IntegrityViolation(
                check="TokenPartition",
                severity="error",
                message="stem ∪ choices does not exactly cover question.tokens",
                question_number=cand.number,
                detail={
                    "missingFromParts": len(missing),
                    "extraInParts": len(extra),
                    "owned": len(owned_set),
                    "parts": len(part_set),
                },
            )
        )
    return out


def _check_immutable_seal(cand: QuestionCandidate) -> list[IntegrityViolation]:
    out: list[IntegrityViolation] = []
    broken = 0
    for tok in cand.tokens or []:
        if tok.type in IMMUTABLE_TYPES and not tok.immutable:
            broken += 1
        elif tok.immutable and tok.type not in IMMUTABLE_TYPES:
            broken += 1
    if broken:
        out.append(
            IntegrityViolation(
                check="ImmutableSeal",
                severity="error",
                message=f"immutable seal broken on {broken} token(s)",
                question_number=cand.number,
                detail={"broken": broken},
            )
        )
    return out


def _check_choice_structure(cand: QuestionCandidate) -> list[IntegrityViolation]:
    out: list[IntegrityViolation] = []
    markers = [
        t
        for t in (cand.tokens or [])
        if t.type == TokenType.CHOICE_MARKER and t.text[:1] in CHOICE_GLYPHS
    ]
    if not markers:
        return out
    choices = cand.choices or []
    if len(choices) != 5:
        out.append(
            IntegrityViolation(
                check="ChoiceStructure",
                severity="error",
                message=f"choice markers present but choice count is {len(choices)}, expected 5",
                question_number=cand.number,
                detail={"choiceCount": len(choices), "markerCount": len(markers)},
            )
        )
        return out
    indexes = sorted(c.index for c in choices if c.index is not None)
    if indexes != [1, 2, 3, 4, 5]:
        out.append(
            IntegrityViolation(
                check="ChoiceStructure",
                severity="error",
                message="choice indexes are not exactly 1..5",
                question_number=cand.number,
                detail={"indexes": indexes},
            )
        )
    return out


def _check_table_shape(cand: QuestionCandidate) -> list[IntegrityViolation]:
    out: list[IntegrityViolation] = []
    tables = list(cand.tables) if cand.tables else ([] if not cand.table else [cand.table])
    for ti, table in enumerate(tables):
        if not table:
            continue
        rows = table.rows or []
        if not rows:
            out.append(
                IntegrityViolation(
                    check="TableShape",
                    severity="warn",
                    message="table candidate has empty rows",
                    question_number=cand.number,
                    detail={"tableIndex": ti},
                )
            )
            continue
        widths = {len(r) for r in rows}
        if len(widths) > 1:
            out.append(
                IntegrityViolation(
                    check="TableShape",
                    severity="error",
                    message="table rows are not rectangular (ragged columns)",
                    question_number=cand.number,
                    detail={"tableIndex": ti, "widths": sorted(widths)},
                )
            )
        if table.cell_tokens:
            if len(table.cell_tokens) != len(rows):
                out.append(
                    IntegrityViolation(
                        check="TableShape",
                        severity="error",
                        message="cell_tokens row count mismatches rows",
                        question_number=cand.number,
                        detail={
                            "tableIndex": ti,
                            "rows": len(rows),
                            "cellTokenRows": len(table.cell_tokens),
                        },
                    )
                )
            else:
                for ri, (row, ct_row) in enumerate(zip(rows, table.cell_tokens)):
                    if len(ct_row) != len(row):
                        out.append(
                            IntegrityViolation(
                                check="TableShape",
                                severity="error",
                                message=f"cell_tokens col count mismatch at row {ri}",
                                question_number=cand.number,
                                detail={
                                    "tableIndex": ti,
                                    "row": ri,
                                    "cols": len(row),
                                    "cellTokenCols": len(ct_row),
                                },
                            )
                        )
                        break
        # Primary pointer consistency
        if cand.table is None and tables:
            out.append(
                IntegrityViolation(
                    check="TableShape",
                    severity="warn",
                    message="tables present but primary table pointer is None",
                    question_number=cand.number,
                )
            )
    return out


def _check_emit_ready(cand: QuestionCandidate) -> list[IntegrityViolation]:
    out: list[IntegrityViolation] = []
    if cand.number is None:
        out.append(
            IntegrityViolation(
                check="EmitReady",
                severity="error",
                message="question number is missing (cannot build questionId)",
                question_number=None,
            )
        )
    # Surface reconstructibility: joining tokens must not raise / must be str
    try:
        stem = "".join(t.text for t in (cand.stem_tokens or []))
        for ch in cand.choices or []:
            _ = ch.text()
        for table in cand.tables or ([] if not cand.table else [cand.table]):
            if table:
                _ = table.as_dict()
                _ = table.as_markdown()
        if not isinstance(stem, str):
            raise TypeError("stem surface is not str")
    except Exception as exc:  # noqa: BLE001 — integrity must catch serializer faults
        out.append(
            IntegrityViolation(
                check="EmitReady",
                severity="error",
                message=f"surface reconstruction failed: {exc}",
                question_number=cand.number,
            )
        )
    return out


def _check_document_structure(
    questions: list[QuestionCandidate], config: ParserConfig
) -> list[IntegrityViolation]:
    out: list[IntegrityViolation] = []
    expected = config.acc_end - config.acc_start + 1
    if len(questions) != expected:
        out.append(
            IntegrityViolation(
                check="DocumentStructure",
                severity="error",
                message=f"question count {len(questions)} != expected {expected}",
                detail={"count": len(questions), "expected": expected},
            )
        )
    numbers = [q.number for q in questions if q.number is not None]
    if len(numbers) != len(set(numbers)):
        out.append(
            IntegrityViolation(
                check="DocumentStructure",
                severity="error",
                message="duplicate question numbers in AST",
                detail={"numbers": numbers},
            )
        )
    expected_set = set(range(config.acc_start, config.acc_end + 1))
    actual_set = set(numbers)
    if actual_set != expected_set:
        out.append(
            IntegrityViolation(
                check="DocumentStructure",
                severity="error",
                message="question number set does not match ACC range",
                detail={
                    "missing": sorted(expected_set - actual_set),
                    "extra": sorted(actual_set - expected_set),
                },
            )
        )
    # Monotonic order in list
    ordered = [n for n in numbers]
    if ordered != sorted(ordered):
        out.append(
            IntegrityViolation(
                check="DocumentStructure",
                severity="warn",
                message="questions are not sorted by number",
                detail={"order": ordered[:10]},
            )
        )
    return out


def _check_semantic_gate(ctx: ParseContext) -> list[IntegrityViolation]:
    out: list[IntegrityViolation] = []
    meta = getattr(ctx, "meta_semantic", None) or {}
    if not meta and not ctx.semantic_reports:
        out.append(
            IntegrityViolation(
                check="SemanticGate",
                severity="warn",
                message="Stage 6.8 semantic reports missing; integrity cannot confirm semantic gate",
            )
        )
        return out
    errors = int(meta.get("errorCount") or 0)
    if errors > 0:
        out.append(
            IntegrityViolation(
                check="SemanticGate",
                severity="error",
                message=f"semantic validation has {errors} error(s); refuse freeze/emit",
                detail={"errorCount": errors},
            )
        )
    return out


def score_question_integrity(cand: QuestionCandidate) -> IntegrityReport:
    violations: list[IntegrityViolation] = []
    violations.extend(_check_token_partition(cand))
    violations.extend(_check_immutable_seal(cand))
    violations.extend(_check_choice_structure(cand))
    violations.extend(_check_table_shape(cand))
    violations.extend(_check_emit_ready(cand))
    hard = [v for v in violations if v.severity == "error"]
    return IntegrityReport(
        question_number=cand.number,
        passed=not hard,
        violations=violations,
    )


class IRIntegrityGate:
    """Stage 6.9 pipeline adapter — freeze AST when invariants hold."""

    name = "IRIntegrityGate"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def run(self, ctx: ParseContext) -> ParseContext:
        if not ctx.questions:
            ctx.ir_frozen = False
            ctx.add(self.name, "error", "no questions — cannot freeze IR")
            ctx.meta_integrity = {
                "passed": False,
                "frozen": False,
                "errorCount": 1,
                "warnCount": 0,
                "questionCount": 0,
            }
            return ctx

        doc_violations = _check_document_structure(ctx.questions, self.config)
        doc_violations.extend(_check_semantic_gate(ctx))

        reports: list[IntegrityReport] = []
        all_violations: list[IntegrityViolation] = list(doc_violations)
        for cand in ctx.questions:
            report = score_question_integrity(cand)
            cand.integrity = report
            reports.append(report)
            all_violations.extend(report.violations)

        errors = [v for v in all_violations if v.severity == "error"]
        warns = [v for v in all_violations if v.severity == "warn"]
        passed = len(errors) == 0
        ctx.ir_frozen = passed
        ctx.integrity_reports = reports
        ctx.meta_integrity = {
            "passed": passed,
            "frozen": passed,
            "questionCount": len(reports),
            "questionsPassed": sum(1 for r in reports if r.passed),
            "errorCount": len(errors),
            "warnCount": len(warns),
            "violations": [
                {
                    "check": v.check,
                    "severity": v.severity,
                    "message": v.message,
                    "questionNumber": v.question_number,
                    "detail": v.detail,
                }
                for v in all_violations
            ],
        }

        level = "info" if passed else "error"
        ctx.add(
            self.name,
            level,
            f"IR {'FROZEN' if passed else 'NOT FROZEN'} · "
            f"errors={len(errors)} · warns={len(warns)} · "
            f"passed={sum(1 for r in reports if r.passed)}/{len(reports)}",
        )
        return ctx
