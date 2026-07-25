"""Stage 7 — QuestionBuilder (read-only Codegen).

Approved Emit Contract: docs/32-parser-emit-contract.md

Invariants:
  1. Refuse unless ctx.ir_frozen is True.
  2. Never mutate AST / Token / TableCandidate.
  3. No replace / regex / trim / normalize / repair of content.
  4. Lossy fields preserved in sidecar AST + provenance.layers for Stage 8.
  5. Emit Source-Truth JSON to regression paths — do NOT overwrite
     data/question-db-mvp.json.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from config import CACHE_DIR, DEFAULT_CONFIG, ROOT, ParserConfig
from context import ParseContext
from emit_surface import (
    filter_choice_body_tokens,
    filter_stem_tokens,
    join_tokens_by_geometry,
    rows_to_markdown,
    token_to_provenance,
)
from model import IMMUTABLE_TYPES, QuestionCandidate, TokenType

# Orthogonal services (lookup only — not AST mutation).
_SCRIPTS = ROOT / "scripts"
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from exam_pipeline.answer_loader import load_accounting_answers  # noqa: E402
from exam_pipeline.constants import EXAM_ROUND  # noqa: E402
from exam_pipeline.pattern_classifier import classify_pattern  # noqa: E402

EMIT_DIR = ROOT / "data" / "regression" / "parser-emit"
EMIT_JSON = EMIT_DIR / "question-db-parser.json"
SIDECAR_DIR = ROOT / "data" / "regression" / "ast-sidecar"
EMIT_VERSION = "7.0.0"


def _posix_path(path: str) -> str:
    """Convert path separators to '/' for JSON portability (not content edit)."""
    return "/".join(str(path).split("\\"))


def require_frozen(ctx: ParseContext) -> None:
    if not getattr(ctx, "ir_frozen", False):
        raise RuntimeError(
            "QuestionBuilder refused: IR is not frozen (Stage 6.9 failed or skipped)"
        )


def _content_hash(*parts: str) -> str:
    h = hashlib.sha256()
    for part in parts:
        h.update(part.encode("utf-8"))
        h.update(b"\0")
    return h.hexdigest()[:16]


def _calc_flags(cand: QuestionCandidate) -> tuple[bool, str]:
    """Derive hasCalculation / questionType from token types only (no regex)."""
    typed = False
    for tok in cand.tokens or []:
        if tok.type in {
            TokenType.NUMBER,
            TokenType.CURRENCY,
            TokenType.PERCENT,
            TokenType.QUANTITY,
        }:
            typed = True
            break
    if typed:
        return True, "calculation"
    return False, "standard"


def _primary_table_markdown(cand: QuestionCandidate) -> str | None:
    table = cand.table
    if not table or not table.rows:
        return None
    md = rows_to_markdown(table.rows)
    return md if md else None


def _build_sidecar_question(cand: QuestionCandidate, year: int) -> dict:
    tables = list(cand.tables) if cand.tables else ([] if not cand.table else [cand.table])
    primary = tables[0] if tables else None
    extra = tables[1:] if len(tables) > 1 else []

    def _table_blob(t) -> dict:
        return {
            "type": "grid",
            "kind": t.kind,
            "source": t.source,
            "bbox": list(t.bbox) if t.bbox else None,
            "rows": [list(r) for r in (t.rows or [])],
            "columnX": list(t.column_x or []),
            "tokens": [token_to_provenance(tok) for tok in (t.tokens or [])],
            "cellTokens": [
                [[token_to_provenance(tok) for tok in cell] for cell in row]
                for row in (t.cell_tokens or [])
            ],
        }

    stem_for_emit = filter_stem_tokens(cand.stem_tokens or [], primary)
    choice_bodies = [
        filter_choice_body_tokens(ch.tokens or []) for ch in (cand.choices or [])
    ]
    return {
        "questionNumber": cand.number,
        "year": year,
        "page": cand.page_number,
        "bbox": list(cand.bbox) if cand.bbox else None,
        "column": cand.column,
        "stemTokens": [token_to_provenance(t) for t in stem_for_emit],
        "stemTokensAll": [token_to_provenance(t) for t in (cand.stem_tokens or [])],
        "choiceTokens": [
            {
                "marker": ch.marker,
                "index": ch.index,
                "layoutKind": ch.layout_kind,
                "column": ch.column,
                "bbox": list(ch.bbox) if ch.bbox else None,
                "tokens": [token_to_provenance(t) for t in (ch.tokens or [])],
                "bodyTokens": [token_to_provenance(t) for t in body],
            }
            for ch, body in zip(cand.choices or [], choice_bodies)
        ],
        "ownedTokens": [token_to_provenance(t) for t in (cand.tokens or [])],
        "table": _table_blob(primary) if primary else None,
        "extraTables": [_table_blob(t) for t in extra],
        "tokenCounts": {
            "owned": len(cand.tokens or []),
            "stemEmit": len(stem_for_emit),
            "choices": [len(b) for b in choice_bodies],
            "table": len(primary.tokens or []) if primary else 0,
            "extraTables": len(extra),
        },
        "immutableTokenCount": sum(
            1 for t in (cand.tokens or []) if t.type in IMMUTABLE_TYPES
        ),
    }


def _build_record(
    cand: QuestionCandidate,
    year: int,
    source_file: str,
    source_kind: str,
    used_ocr: bool,
    answer: int | None,
    pattern_id: str,
    chapter_id: str,
    sidecar_rel: str,
    sidecar_q: dict,
) -> dict:
    primary = cand.table
    stem_tokens = filter_stem_tokens(cand.stem_tokens or [], primary)
    question = join_tokens_by_geometry(stem_tokens)
    table_md = _primary_table_markdown(cand)
    has_table = primary is not None and bool(primary.rows)
    if has_table and table_md is not None:
        original = question + "\n" + table_md
    else:
        original = question

    choices: list[str] = []
    for ch in cand.choices or []:
        body = filter_choice_body_tokens(ch.tokens or [])
        choices.append(join_tokens_by_geometry(body))

    has_calc, qtype = _calc_flags(cand)
    qid = f"ACC_{year}_Q{cand.number:03d}"
    content_hash = _content_hash(question, table_md or "", *choices)

    provenance = {
        "emitVersion": EMIT_VERSION,
        "irFrozen": True,
        "contentHash": content_hash,
        "layers": {
            "source": {
                "path": source_file,
                "kind": source_kind,
                "usedOcr": used_ocr,
                "year": year,
            },
            "layout": {
                "page": cand.page_number,
                "bbox": list(cand.bbox) if cand.bbox else None,
                "column": cand.column,
                "spanCount": len(cand.spans or []),
            },
            "ast": {
                "sidecar": _posix_path(sidecar_rel),
                "questionNumber": cand.number,
                "tokenCounts": sidecar_q.get("tokenCounts"),
                "hasExtraTables": bool(sidecar_q.get("extraTables")),
                "tableKind": (primary.kind if primary else None),
            },
            "json": {
                "fields": ["question", "originalQuestion", "choices", "table"],
                "choiceCount": len(choices),
                "hasTable": has_table,
            },
        },
    }

    return {
        "questionId": qid,
        "year": year,
        "subjectId": "ACC",
        "chapterId": chapter_id,
        "patternId": pattern_id,
        "difficulty": "medium",
        "originalQuestion": original,
        "question": question,
        "choices": choices,
        "answer": answer,
        "answerIndex": answer,
        "questionType": qtype,
        "hasTable": has_table,
        "hasCalculation": has_calc,
        "figure": False,
        "table": table_md if has_table else None,
        "formula": None,
        "source": {
            "type": "original_exam",
            "examId": "APPRAISER",
            "year": year,
            "round": 1,
            "examRound": EXAM_ROUND.get(year),
            "questionNumber": cand.number,
            "sourceFile": source_file,
            "sourceKind": source_kind,
            "page": cand.page_number,
            "usedOcr": used_ocr,
        },
        "solution": {
            "summary": "",
            "algorithm": "",
            "calculationProcess": "",
            "explanation": "",
            "steps": [],
            "wrongAnalysis": [],
            "memoryPoint": "",
        },
        "provenance": provenance,
    }


class QuestionBuilder:
    """Stage 7 pipeline adapter — read-only codegen + sidecar write."""

    name = "QuestionBuilder"

    def __init__(
        self,
        config: ParserConfig | None = None,
        *,
        write_outputs: bool = True,
        answers: dict[int, int] | None = None,
    ):
        self.config = config or DEFAULT_CONFIG
        self.write_outputs = write_outputs
        self._answers_override = answers

    def run(self, ctx: ParseContext) -> ParseContext:
        require_frozen(ctx)
        if not ctx.questions:
            ctx.add(self.name, "error", "no questions to emit")
            return ctx

        year = ctx.year
        if year is None:
            ctx.add(self.name, "error", "year missing on ParseContext")
            return ctx

        raw = ctx.raw
        source_file = ""
        source_kind = "pdf"
        used_ocr = False
        if raw is not None:
            if raw.path is not None:
                try:
                    source_file = _posix_path(str(raw.path.relative_to(ROOT)))
                except ValueError:
                    source_file = _posix_path(str(raw.path))
            source_kind = raw.kind or "pdf"
            used_ocr = bool(raw.needs_ocr)
        if ctx.layout is not None:
            used_ocr = bool(ctx.layout.used_ocr)
            if not source_file:
                source_file = _posix_path(ctx.layout.source_path)
            if ctx.layout.source_kind:
                source_kind = ctx.layout.source_kind

        if self._answers_override is not None:
            answers = self._answers_override
        else:
            answers = load_accounting_answers(year, CACHE_DIR)

        sidecar_rel = f"data/regression/ast-sidecar/{year}.json"
        sidecar_questions: list[dict] = []
        records: list[dict] = []

        for cand in ctx.questions:
            sc_q = _build_sidecar_question(cand, year)
            sidecar_questions.append(sc_q)
            # Pattern from emitted surfaces (lookup only)
            stem_tokens = filter_stem_tokens(cand.stem_tokens or [], cand.table)
            q_surface = join_tokens_by_geometry(stem_tokens)
            table_md = _primary_table_markdown(cand)
            pattern_src = q_surface if table_md is None else q_surface + "\n" + table_md
            pattern_id, chapter_id = classify_pattern(pattern_src)
            answer = answers.get(cand.number) if cand.number is not None else None
            records.append(
                _build_record(
                    cand,
                    year,
                    source_file,
                    source_kind,
                    used_ocr,
                    answer,
                    pattern_id,
                    chapter_id,
                    sidecar_rel,
                    sc_q,
                )
            )

        sidecar_doc = {
            "year": year,
            "emitVersion": EMIT_VERSION,
            "sourceFile": source_file,
            "sourceKind": source_kind,
            "usedOcr": used_ocr,
            "irFrozen": True,
            "questionCount": len(sidecar_questions),
            "questions": sidecar_questions,
        }

        ctx.records = records
        ctx.sidecar_doc = sidecar_doc
        ctx.meta_builder = {
            "emitVersion": EMIT_VERSION,
            "year": year,
            "recordCount": len(records),
            "withAnswer": sum(1 for r in records if r.get("answer") is not None),
            "withTable": sum(1 for r in records if r.get("hasTable")),
            "sidecar": _posix_path(sidecar_rel),
            "emitJson": _posix_path(str(EMIT_JSON.relative_to(ROOT))),
            "wroteOutputs": False,
        }

        if self.write_outputs:
            SIDECAR_DIR.mkdir(parents=True, exist_ok=True)
            EMIT_DIR.mkdir(parents=True, exist_ok=True)
            sidecar_path = SIDECAR_DIR / f"{year}.json"
            sidecar_path.write_text(
                json.dumps(sidecar_doc, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            # Per-year emit shard (merged by CLI / phase runner)
            year_emit = EMIT_DIR / f"questions-{year}.json"
            year_emit.write_text(
                json.dumps(
                    {
                        "version": EMIT_VERSION,
                        "year": year,
                        "goal": "source_truth",
                        "note": "Not a clone of question-db-mvp.json",
                        "questions": records,
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            ctx.meta_builder["wroteOutputs"] = True
            ctx.meta_builder["yearEmit"] = _posix_path(str(year_emit.relative_to(ROOT)))

        ctx.add(
            self.name,
            "info",
            f"emitted {len(records)} records · answers="
            f"{ctx.meta_builder['withAnswer']} · tables={ctx.meta_builder['withTable']}",
        )
        return ctx


def merge_year_emits(years: list[int], out_path: Path | None = None) -> Path:
    """Merge per-year emit shards into one Source-Truth question DB (regression)."""
    out_path = out_path or EMIT_JSON
    merged: list[dict] = []
    for year in years:
        path = EMIT_DIR / f"questions-{year}.json"
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        merged.extend(payload.get("questions") or [])
    merged.sort(key=lambda q: (q.get("year"), q.get("source", {}).get("questionNumber")))
    doc = {
        "version": EMIT_VERSION,
        "goal": "source_truth",
        "note": "Generated by Stage 7 QuestionBuilder. Not matched to legacy MVP JSON.",
        "count": len(merged),
        "questions": merged,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path
