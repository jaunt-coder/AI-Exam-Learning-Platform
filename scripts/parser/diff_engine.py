"""Stage 8 — Diff Engine (Source / Layout / AST / JSON).

Read-only comparison. Never mutates AST or emitted records.
Consumes provenance.layers + sidecar produced by Stage 7.

This module is the connection point for full Diff Gate metrics.
Phase-7 wires a structural skeleton; metric depth expands without
changing Builder.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import TokenType

_NUM_RE = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d{3,}")


@dataclass
class DiffIssue:
    layer: str  # source|layout|ast|json|cross
    severity: str  # error|warn|info
    message: str
    question_number: int | None = None
    detail: dict = field(default_factory=dict)


def _numbers_in_text(text: str) -> list[str]:
    return _NUM_RE.findall(text or "")


def _ast_immutable_texts(sidecar_q: dict) -> list[str]:
    out: list[str] = []
    for tok in sidecar_q.get("ownedTokens") or []:
        if tok.get("immutable") or tok.get("type") in {
            TokenType.NUMBER,
            TokenType.CURRENCY,
            TokenType.PERCENT,
            TokenType.YEAR,
            TokenType.DATE,
            TokenType.QUANTITY,
        }:
            if tok.get("text"):
                out.append(tok["text"])
    return out


def _compare_question(
    record: dict,
    sidecar_q: dict | None,
    layout_span_count: int | None,
) -> list[DiffIssue]:
    issues: list[DiffIssue] = []
    qn = record.get("source", {}).get("questionNumber")
    prov = record.get("provenance") or {}
    layers = prov.get("layers") or {}

    # --- provenance completeness ---
    for name in ("source", "layout", "ast", "json"):
        if name not in layers:
            issues.append(
                DiffIssue(
                    layer="cross",
                    severity="error",
                    message=f"provenance.layers.{name} missing",
                    question_number=qn,
                )
            )

    # --- JSON structural ---
    choices = record.get("choices") or []
    if len(choices) != 5:
        issues.append(
            DiffIssue(
                layer="json",
                severity="error",
                message=f"choices length {len(choices)} != 5",
                question_number=qn,
            )
        )
    if record.get("hasTable") and not record.get("table"):
        issues.append(
            DiffIssue(
                layer="json",
                severity="error",
                message="hasTable true but table field empty",
                question_number=qn,
            )
        )
    if isinstance(record.get("table"), dict):
        issues.append(
            DiffIssue(
                layer="json",
                severity="error",
                message="table must be markdown string, not grid dict",
                question_number=qn,
            )
        )

    # --- AST sidecar present ---
    if sidecar_q is None:
        issues.append(
            DiffIssue(
                layer="ast",
                severity="error",
                message="sidecar question entry missing",
                question_number=qn,
            )
        )
        return issues

    # --- AST ↔ JSON surface: immutable token texts must appear in JSON surfaces ---
    surfaces = "\n".join(
        [
            record.get("question") or "",
            record.get("originalQuestion") or "",
            record.get("table") or "",
            "\n".join(choices),
        ]
    )
    missing_imm = []
    for text in _ast_immutable_texts(sidecar_q):
        # Currency-only glyphs may move into fused cells; still require digit-bearing
        # immutable texts to survive in JSON.
        if any(ch.isdigit() for ch in text) and text not in surfaces:
            missing_imm.append(text)
    if missing_imm:
        issues.append(
            DiffIssue(
                layer="cross",
                severity="error",
                message="immutable AST texts missing from JSON surfaces",
                question_number=qn,
                detail={"missing": missing_imm[:12], "count": len(missing_imm)},
            )
        )

    # --- Layout layer pointer ---
    layout = layers.get("layout") or {}
    if layout.get("page") is None:
        issues.append(
            DiffIssue(
                layer="layout",
                severity="warn",
                message="layout.page missing in provenance",
                question_number=qn,
            )
        )
    if layout_span_count is not None and layout_span_count == 0:
        issues.append(
            DiffIssue(
                layer="layout",
                severity="warn",
                message="layout document has zero spans",
                question_number=qn,
            )
        )

    # --- Source layer ---
    source = layers.get("source") or {}
    if not source.get("path"):
        issues.append(
            DiffIssue(
                layer="source",
                severity="warn",
                message="source.path empty in provenance",
                question_number=qn,
            )
        )

    # --- AST extra tables preserved in sidecar ---
    extras = sidecar_q.get("extraTables") or []
    if extras and not (layers.get("ast") or {}).get("hasExtraTables"):
        issues.append(
            DiffIssue(
                layer="ast",
                severity="warn",
                message="extraTables in sidecar but provenance.ast.hasExtraTables false",
                question_number=qn,
            )
        )

    # Number multiset hint (info): JSON vs AST digit-bearing tokens
    json_nums = set(_numbers_in_text(surfaces))
    ast_nums = set()
    for tok in sidecar_q.get("ownedTokens") or []:
        if tok.get("type") == TokenType.NUMBER and tok.get("text"):
            ast_nums.add(tok["text"].replace(",", ""))
    # normalize commas in json nums for loose compare
    json_norm = {n.replace(",", "") for n in json_nums}
    only_ast = sorted(ast_nums - json_norm)
    if only_ast:
        issues.append(
            DiffIssue(
                layer="cross",
                severity="warn",
                message="AST NUMBER tokens not found in JSON number scan",
                question_number=qn,
                detail={"onlyAst": only_ast[:12], "count": len(only_ast)},
            )
        )

    return issues


class DiffEngine:
    """Stage 8 pipeline adapter — 4-layer read-only diff."""

    name = "DiffEngine"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def run(self, ctx: ParseContext) -> ParseContext:
        records = getattr(ctx, "records", None) or []
        sidecar = getattr(ctx, "sidecar_doc", None) or {}
        if not records:
            ctx.add(self.name, "warn", "no records — skip diff")
            ctx.meta_diff = {"skipped": True, "reason": "no records"}
            return ctx

        by_num = {
            q.get("questionNumber"): q for q in (sidecar.get("questions") or [])
        }
        layout_spans = ctx.layout.span_count if ctx.layout is not None else None

        all_issues: list[DiffIssue] = []
        for rec in records:
            qn = rec.get("source", {}).get("questionNumber")
            all_issues.extend(_compare_question(rec, by_num.get(qn), layout_spans))

        errors = [i for i in all_issues if i.severity == "error"]
        warns = [i for i in all_issues if i.severity == "warn"]
        ctx.meta_diff = {
            "skipped": False,
            "layers": ["source", "layout", "ast", "json"],
            "questionCount": len(records),
            "errorCount": len(errors),
            "warnCount": len(warns),
            "passed": len(errors) == 0,
            "issues": [
                {
                    "layer": i.layer,
                    "severity": i.severity,
                    "message": i.message,
                    "questionNumber": i.question_number,
                    "detail": i.detail,
                }
                for i in all_issues
            ],
        }
        level = "info" if not errors else "error"
        ctx.add(
            self.name,
            level,
            f"diff {'PASS' if not errors else 'FAIL'} · "
            f"errors={len(errors)} · warns={len(warns)}",
        )
        return ctx
