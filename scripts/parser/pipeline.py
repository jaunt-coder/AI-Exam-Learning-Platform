"""Stage Pipeline.

Full default path (MVP):
    Loader → Extractor → DualPage → Footer → Tokenizer → Question → Choice
    → Table → CellRecon → SemanticRepair(6.7) → SemanticValidator(6.8)
    → IRIntegrityGate(6.9) → QuestionBuilder(7) → DiffEngine(8)

Emit writes Source-Truth JSON under data/regression/parser-emit/
(never overwrites data/question-db-mvp.json).

Run the built-in verification demo:
    py -3 scripts/parser/pipeline.py [year]
"""
from __future__ import annotations

import re
import statistics
import sys
from typing import Protocol

# When run directly, scripts/parser is sys.path[0], so absolute imports resolve.
from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from extractor import TextExtractor
from loader import DocumentLoader
from choice_boundary import ChoiceBoundaryDetector
from dual_page import DualPageSplitter
from footer_rule import FooterRule
from model import LayoutDocument, Page, Span, TokenType, iter_raw_tokens, union_bbox
from question_boundary import QuestionBoundaryDetector
from diff_engine import DiffEngine
from ir_integrity import IRIntegrityGate
from question_builder import QuestionBuilder
from semantic_repair import SemanticRepair
from semantic_validator import SemanticValidator
from table_cell_reconstructor import TableCellReconstructor
from table_parser import TableParser
from tokenizer import Tokenizer


class Stage(Protocol):
    name: str

    def run(self, ctx: ParseContext) -> ParseContext: ...


class ParsePipeline:
    """Runs a fixed, ordered list of stages over a ParseContext."""

    def __init__(self, stages: list[Stage]):
        self.stages = stages

    def run(self, ctx: ParseContext) -> ParseContext:
        for stage in self.stages:
            ctx = stage.run(ctx)
            if ctx.has_errors():
                break
        return ctx


def layout_pipeline(config: ParserConfig | None = None) -> ParsePipeline:
    """Stages 1-2 only (Phase 1)."""
    config = config or DEFAULT_CONFIG
    return ParsePipeline([DocumentLoader(config), TextExtractor(config)])


def default_pipeline(
    config: ParserConfig | None = None,
    *,
    emit: bool = True,
    write_emit: bool = True,
) -> ParsePipeline:
    """Full pipeline through Stage 7 emit + Stage 8 diff."""
    config = config or DEFAULT_CONFIG
    stages: list[Stage] = [
        DocumentLoader(config),
        TextExtractor(config),
        DualPageSplitter(config),
        FooterRule(config),
        Tokenizer(config),
        QuestionBoundaryDetector(config),
        ChoiceBoundaryDetector(config),
        TableParser(config),
        TableCellReconstructor(config),
        SemanticRepair(config),
        SemanticValidator(config),
        IRIntegrityGate(config),
    ]
    if emit:
        stages.append(QuestionBuilder(config, write_outputs=write_emit))
        stages.append(DiffEngine(config))
    return ParsePipeline(stages)


def build_layout(year: int, config: ParserConfig | None = None) -> tuple[LayoutDocument | None, ParseContext]:
    """Convenience: run Loader -> Extractor and return (LayoutDocument, ctx)."""
    ctx = ParseContext(year=year, config=config or DEFAULT_CONFIG)
    ctx = layout_pipeline(ctx.config).run(ctx)
    return ctx.layout, ctx


def physical_pipeline(
    config: ParserConfig | None = None,
    *,
    emit: bool = False,
) -> ParsePipeline:
    """Full pipeline WITHOUT DualPageSplitter — treats each physical sheet as one
    page (the pre-Phase-4-1 behaviour). Used as the Before baseline."""
    config = config or DEFAULT_CONFIG
    stages: list[Stage] = [
        DocumentLoader(config),
        TextExtractor(config),
        FooterRule(config),
        Tokenizer(config),
        QuestionBoundaryDetector(config),
        ChoiceBoundaryDetector(config),
        TableParser(config),
        TableCellReconstructor(config),
        SemanticRepair(config),
        SemanticValidator(config),
        IRIntegrityGate(config),
    ]
    if emit:
        stages.append(QuestionBuilder(config, write_outputs=False))
        stages.append(DiffEngine(config))
    return ParsePipeline(stages)


def table_only_pipeline(config: ParserConfig | None = None) -> ParsePipeline:
    """Full pipeline WITHOUT Stage 6.5 cell reconstruction (Phase 6 Before)."""
    config = config or DEFAULT_CONFIG
    return ParsePipeline(
        [
            DocumentLoader(config),
            TextExtractor(config),
            DualPageSplitter(config),
            FooterRule(config),
            Tokenizer(config),
            QuestionBoundaryDetector(config),
            ChoiceBoundaryDetector(config),
            TableParser(config),
        ]
    )


def build_parse(
    year: int,
    config: ParserConfig | None = None,
    split: bool = True,
    reconstruct_cells: bool = True,
    emit: bool = False,
    write_emit: bool = False,
) -> ParseContext:
    """Run the full pipeline and return the populated ParseContext.

    `split=False`            — physical-page baseline (no dual-page split)
    `reconstruct_cells=False`— stop after TableParser (Stage 6.5 Before)
    `emit=True`              — run Stage 7 Builder + Stage 8 Diff
    `write_emit=True`        — write regression JSON/sidecar (never MVP DB)
    """
    ctx = ParseContext(year=year, config=config or DEFAULT_CONFIG)
    if not split:
        pipe = physical_pipeline(ctx.config, emit=emit)
    elif not reconstruct_cells:
        pipe = table_only_pipeline(ctx.config)
    else:
        pipe = default_pipeline(ctx.config, emit=emit, write_emit=write_emit)
    return pipe.run(ctx)


# ---------------------------------------------------------------------------
# Verification demo (read-only analysis; NOT Stage 4/5/6 logic)
# ---------------------------------------------------------------------------
def _fmt_bbox(bbox) -> str:
    if not bbox:
        return "None"
    return "(" + ", ".join(f"{v:.1f}" for v in bbox) + ")"


def _demo_columns(page: Page) -> None:
    """Show that a 2-column layout is separable by x-coordinates alone."""
    lines = page.lines()
    line_boxes = [union_bbox([s.bbox for s in ln]) for ln in lines]
    line_boxes = [b for b in line_boxes if b]
    if not line_boxes:
        print("    (no lines)")
        return
    mid = page.width / 2.0
    left = [b for b in line_boxes if (b[0] + b[2]) / 2 < mid]
    right = [b for b in line_boxes if (b[0] + b[2]) / 2 >= mid]
    print(f"    page width={page.width:.1f}  midpoint={mid:.1f}  lines={len(line_boxes)}")
    if left:
        print(f"    LEFT  column: {len(left):3d} lines  x0(median)={statistics.median(b[0] for b in left):.1f}  "
              f"x1(median)={statistics.median(b[2] for b in left):.1f}")
    if right:
        print(f"    RIGHT column: {len(right):3d} lines  x0(median)={statistics.median(b[0] for b in right):.1f}  "
              f"x1(median)={statistics.median(b[2] for b in right):.1f}")
    if left and right:
        left_body_right = statistics.median(b[2] for b in left)
        right_body_left = statistics.median(b[0] for b in right)
        gap = right_body_left - left_body_right
        verdict = "CLEAR GUTTER" if gap > 0 else "columns interleave (tables span full width)"
        print(f"    column bodies: left ends ~{left_body_right:.1f}, right starts ~{right_body_left:.1f} "
              f"(gap {gap:+.1f}) -> {verdict}")


_VALUE_RE = re.compile(r"^[(\[]?\d[\d,]*(?:\.\d+)?%?[)\]]?$")
_HANGUL_RE = re.compile(r"[가-힣]")


def _merge_line_cells(line_spans: list[Span]) -> list[Span]:
    """Merge glyph-fragmented spans on one line into cells by x-adjacency.

    These PDFs split numbers/symbols into separate spans (e.g. '3','9','0,000').
    Because every span keeps its bbox, a deterministic x-gap merge rebuilds the
    real cell ('390,000'). Larger gaps mark true column separators. This is a
    demonstration of Stage 3/6 feasibility, not the stage implementation itself.
    """
    ordered = sorted(line_spans, key=lambda s: s.x0)
    cells: list[Span] = []
    for span in ordered:
        if cells:
            prev = cells[-1]
            gap = span.x0 - prev.x1
            if gap <= 0.5 * max(prev.size, span.size, 1.0):
                merged_bbox = (prev.x0, min(prev.y0, span.y0), span.x1, max(prev.y1, span.y1))
                cells[-1] = Span(
                    text=prev.text + span.text, bbox=merged_bbox, font=prev.font,
                    size=prev.size, flags=prev.flags, color=prev.color,
                    page_number=prev.page_number, block_index=prev.block_index,
                    line_index=prev.line_index, span_index=prev.span_index,
                )
                continue
        cells.append(Span(
            text=span.text, bbox=span.bbox, font=span.font, size=span.size,
            flags=span.flags, color=span.color, page_number=span.page_number,
            block_index=span.block_index, line_index=span.line_index,
            span_index=span.span_index,
        ))
    return [c for c in cells if c.text.strip()]


def _value_cells(page: Page) -> list[Span]:
    """All numeric/percent cells on a page (fragmented spans merged per line)."""
    out: list[Span] = []
    for ln in page.lines():
        for cell in _merge_line_cells(ln):
            text = cell.text.strip()
            if _HANGUL_RE.search(text):
                continue
            if _VALUE_RE.match(text):
                out.append(cell)
    return out


def _cluster_rows(cells: list[Span]) -> list[list[Span]]:
    """Cluster value cells into rows by y-band (tables emit cells as separate
    blocks/lines, so rows are recovered by shared vertical position, not by the
    PDF's own line grouping)."""
    if not cells:
        return []
    cells = sorted(cells, key=lambda c: (c.y0, c.x0))
    heights = [c.y1 - c.y0 for c in cells]
    band = max(statistics.median(heights) * 0.7, 4.0)
    rows: list[list[Span]] = [[cells[0]]]
    for cell in cells[1:]:
        if abs(cell.y0 - rows[-1][-1].y0) <= band:
            rows[-1].append(cell)
        else:
            rows.append([cell])
    return rows


def _demo_tables(layout: LayoutDocument) -> None:
    """Show that table cells retain bbox and rows/cols are coordinate-recoverable."""
    best_page = None
    best_block: list[list[Span]] = []
    for page in layout.pages:
        rows = [r for r in _cluster_rows(_value_cells(page)) if len(r) >= 2]
        # find the largest run of vertically-contiguous multi-cell rows
        run: list[list[Span]] = []
        for prev, cur in zip([None] + rows, rows):
            if prev is None:
                run = [cur]
            else:
                gap = cur[0].y0 - prev[0].y0
                if gap <= max((cur[0].y1 - cur[0].y0) * 3.0, 40.0):
                    run.append(cur)
                else:
                    run = [cur]
            if len(run) > len(best_block):
                best_block = list(run)
                best_page = page
    if not best_page or len(best_block) < 3:
        print("    (no multi-row numeric grid found; per-cell bbox still preserved)")
        return
    region = union_bbox([s.bbox for row in best_block for s in row])
    print(f"    table page: p{best_page.number}  numeric rows={len(best_block)}")
    print(f"    table region bbox: {_fmt_bbox(region)}")
    widest = max(best_block, key=len)
    col_x = sorted(round(s.x0, 1) for s in widest)
    print(f"    column x-anchors ({len(col_x)} cols): {col_x}")
    for row in best_block[:4]:
        preview = " | ".join(s.text.strip() for s in sorted(row, key=lambda s: s.x0)[:8])
        print(f"      row: {preview}")


def _demo(year: int) -> int:
    print(f"=== Parser Engine Phase 1 — LayoutDocument verification (year={year}) ===\n")
    layout, ctx = build_layout(year)

    print("[diagnostics]")
    for d in ctx.diagnostics:
        print(f"  {d.level:7s} {d.stage}: {d.message}")
    print()

    if layout is None or layout.page_count == 0:
        print("no layout produced.")
        return 1

    tokens = iter_raw_tokens(layout)
    print("[1] LayoutDocument summary")
    print(f"    source_kind = {layout.source_kind}")
    print(f"    used_ocr    = {layout.used_ocr}")
    print(f"    page_count  = {layout.page_count}")
    print(f"    span_count  = {layout.span_count}")
    print(f"    token_count = {len(tokens)}  (raw scaffolding; Stage 3 will type these)")
    print()

    # pick the content page with the most spans for examples
    content_page = max(layout.pages, key=lambda p: p.span_count)
    print(f"[2] Example spans (page {content_page.number}, {content_page.span_count} spans)")
    for span in content_page.spans[:6]:
        text = span.text if len(span.text) <= 34 else span.text[:31] + "..."
        print(f"    bbox={_fmt_bbox(span.bbox)}  font={span.font[:18]:18s} "
              f"size={span.size:4.1f} bold={int(span.is_bold)}  text={text!r}")
    if content_page.image_bboxes:
        print(f"    image regions on page: {len(content_page.image_bboxes)} "
              f"(e.g. {_fmt_bbox(content_page.image_bboxes[0])})")
    print()

    print(f"[3] 2-column separation by coordinates (page {content_page.number})")
    _demo_columns(content_page)
    print()

    print("[4] Table region bbox survives extraction")
    _demo_tables(layout)
    print()

    # ---- Phase 2 stages ----
    full = build_parse(year)
    print("[5] Stage 3 Tokenizer — typed, coordinate-anchored tokens")
    by_type: dict[str, int] = {}
    for t in full.tokens:
        by_type[t.type] = by_type.get(t.type, 0) + 1
    for k in sorted(by_type):
        print(f"    {k:16s} {by_type[k]:5d}")
    print(f"    TOTAL           {len(full.tokens):5d}")
    print()
    print("    special-token samples (immutable, original text preserved):")
    _sample_tokens(full.tokens, (TokenType.YEAR, TokenType.CURRENCY, TokenType.QUANTITY,
                                 TokenType.PERCENT, TokenType.DATE))
    print()

    print("[6] Footer/Header Rule — running boilerplate removed")
    foot = next((d for d in full.diagnostics if d.stage == "FooterRule"), None)
    print(f"    {foot.message if foot else '(no footer diagnostic)'}")
    print(f"    removed spans total : {len(full.removed_spans)}")
    for s in full.removed_spans[:4]:
        print(f"      - p{s.page_number} bbox={_fmt_bbox(s.bbox)} text={s.text[:40]!r}")
    print()

    print("[7] Stage 4 Question Boundary — layout-based candidates")
    stats = full.meta_boundary
    print(f"    detected questions : {stats.get('count', 0)} / {full.config.acc_end - full.config.acc_start + 1}")
    print(f"    missing={stats.get('missing')} duplicates={stats.get('duplicates')} foreign={stats.get('foreign')}")
    print()

    print("[8] Stage 5 Choice Boundary — ①~⑤ split by coordinates")
    ch = full.meta_choice
    print(f"    markers {ch.get('foundMarkers')}/{ch.get('expectedMarkers')} · "
          f"5-choice {ch.get('count5Questions')}/{ch.get('questions')} · "
          f"contaminated={ch.get('contaminated')} · kinds={ch.get('layoutKinds')}")
    for cand in full.questions[:2]:
        print(f"      Q{cand.number}: choices={len(cand.choices)}")
        for c in cand.choices:
            txt = c.text()
            txt = txt if len(txt) <= 56 else txt[:53] + "..."
            print(f"        {c.marker} [{c.layout_kind} col{c.column}] {txt}")
    return 0


def _sample_tokens(tokens, types, per_type: int = 4) -> None:
    seen: dict[str, int] = {t: 0 for t in types}
    for t in tokens:
        if t.type in seen and seen[t.type] < per_type:
            extra = f" -> {t.normalized}" if t.normalized else ""
            if t.unit:
                extra += f" unit={t.unit!r}"
            print(f"      {t.type:9s} p{t.page_number} bbox={_fmt_bbox(t.bbox)} "
                  f"text={t.text!r}{extra}")
            seen[t.type] += 1


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # console may default to cp949
    except (AttributeError, ValueError):
        pass
    year_arg = int(sys.argv[1]) if len(sys.argv) > 1 else 2015
    sys.exit(_demo(year_arg))
