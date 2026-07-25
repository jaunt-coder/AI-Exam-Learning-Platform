"""Shared pipeline state (Phase 1).

ParseContext is the single object threaded through every stage. Each stage
reads what it needs and writes its own output field, leaving prior fields
intact (monotonic enrichment).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from config import DEFAULT_CONFIG, ParserConfig
from model import LayoutDocument, QuestionCandidate, RawDocument, Span, Token


@dataclass
class Diagnostic:
    """A non-fatal note emitted by any stage (never mutates data)."""

    stage: str
    level: str           # "info" | "warning" | "error"
    message: str


@dataclass
class ParseContext:
    """Accumulated state across stages.

    Phase 1 populates: year, config, raw (Stage 1), layout (Stage 2).
    Later phases add: tokens, questions, choices, tables, reports.
    """

    year: int | None = None
    config: ParserConfig = DEFAULT_CONFIG
    raw: RawDocument | None = None
    layout: LayoutDocument | None = None
    removed_spans: list[Span] = field(default_factory=list)    # FooterRule (Stage 2.5)
    tokens: list[Token] = field(default_factory=list)          # Stage 3
    questions: list[QuestionCandidate] = field(default_factory=list)  # Stage 4
    meta_boundary: dict = field(default_factory=dict)          # Stage 4 stats
    meta_choice: dict = field(default_factory=dict)            # Stage 5 stats
    meta_table: dict = field(default_factory=dict)             # Stage 6 stats
    meta_cell_recon: dict = field(default_factory=dict)        # Stage 6.5 stats
    meta_repair: dict = field(default_factory=dict)            # Stage 6.7 stats
    meta_semantic: dict = field(default_factory=dict)          # Stage 6.8 stats
    semantic_reports: list = field(default_factory=list)       # Stage 6.8 per-question
    meta_integrity: dict = field(default_factory=dict)         # Stage 6.9 stats
    integrity_reports: list = field(default_factory=list)      # Stage 6.9 per-question
    ir_frozen: bool = False                                    # Stage 6.9 freeze flag
    records: list = field(default_factory=list)                # Stage 7 JSON records
    sidecar_doc: dict = field(default_factory=dict)            # Stage 7 AST sidecar
    meta_builder: dict = field(default_factory=dict)           # Stage 7 stats
    meta_diff: dict = field(default_factory=dict)              # Stage 8 stats
    diagnostics: list[Diagnostic] = field(default_factory=list)

    def add(self, stage: str, level: str, message: str) -> None:
        self.diagnostics.append(Diagnostic(stage=stage, level=level, message=message))

    def has_errors(self) -> bool:
        return any(d.level == "error" for d in self.diagnostics)
