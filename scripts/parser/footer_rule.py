"""Stage 2.5 — Footer / Header Rule.

Removes running page furniture (page numbers, exam-paper codes, 교시 markers)
from the LayoutDocument BEFORE tokenization, so this boilerplate never drifts
into a question's span slice.

Deletion is decided by LAYOUT EVIDENCE, never by "looks like a number":
    - position   : line sits in the top/bottom margin band
    - repetition : the same digit-normalized signature repeats across pages
    - font       : signature is keyed with its font-size bucket
    - safety     : lines containing a CHOICE_MARKER are never removed; a top-band
                   line is only removed if it carries a real text run (so bare
                   question numbers like "61." are preserved)

Every removed span is recorded on ctx.removed_spans for auditing / regression.
"""
from __future__ import annotations

from math import ceil

from config import DEFAULT_CONFIG, ParserConfig
from context import ParseContext
from model import LayoutDocument, Span, union_bbox

CHOICE_MARKERS = "①②③④⑤⑥⑦⑧⑨⑩"
TOP_BAND_RATIO = 0.12       # top 12% of page height
BOTTOM_BAND_RATIO = 0.88    # bottom 12% of page height
MIN_REPEAT_PAGES = 3
REPEAT_PAGE_FRACTION = 0.30
MAX_SIGNATURE_LEN = 60


def _normalize_sig(text: str) -> str:
    """Digit runs -> '#', whitespace collapsed. Repetition key, not deletion key."""
    out = []
    for ch in text:
        out.append("#" if ch.isdigit() else ch)
    return "".join(out).replace(" ", "").strip()


def _has_letter_run(sig: str, length: int) -> bool:
    run = 0
    for ch in sig:
        if ch.isalpha() or "가" <= ch <= "힣":
            run += 1
            if run >= length:
                return True
        else:
            run = 0
    return False


class _Line:
    __slots__ = ("spans", "text", "sig", "band", "size", "cy")

    def __init__(self, spans: list[Span], height: float):
        ordered = sorted(spans, key=lambda s: s.x0)
        self.spans = ordered
        self.text = "".join(s.text for s in ordered)
        self.sig = _normalize_sig(self.text)
        bbox = union_bbox([s.bbox for s in ordered])
        self.cy = (bbox[1] + bbox[3]) / 2.0 if bbox else 0.0
        self.size = round(max((s.size for s in ordered), default=0.0))
        if self.cy <= height * TOP_BAND_RATIO:
            self.band = "top"
        elif self.cy >= height * BOTTOM_BAND_RATIO:
            self.band = "bottom"
        else:
            self.band = "body"


class FooterRule:
    """Stage 2.5 pipeline adapter."""

    name = "FooterRule"

    def __init__(self, config: ParserConfig | None = None):
        self.config = config or DEFAULT_CONFIG

    def _collect_margin_lines(self, layout: LayoutDocument) -> list[tuple[int, _Line]]:
        lines: list[tuple[int, _Line]] = []
        for pi, page in enumerate(layout.pages):
            for group in page.lines():
                ln = _Line(group, page.height)
                if ln.band in ("top", "bottom") and ln.sig:
                    lines.append((pi, ln))
        return lines

    def _boilerplate_signatures(self, lines: list[tuple[int, _Line]], total_pages: int) -> set[tuple]:
        pages_by_key: dict[tuple, set[int]] = {}
        for pi, ln in lines:
            key = (ln.band, ln.sig, ln.size)
            pages_by_key.setdefault(key, set()).add(pi)
        threshold = max(MIN_REPEAT_PAGES, ceil(REPEAT_PAGE_FRACTION * total_pages))
        boiler: set[tuple] = set()
        for key, pages in pages_by_key.items():
            band, sig, _size = key
            if len(sig) > MAX_SIGNATURE_LEN:
                continue
            if any(m in sig for m in CHOICE_MARKERS):
                continue
            if len(pages) < threshold:
                continue
            # top band: require a genuine text run so bare question numbers survive
            if band == "top" and not _has_letter_run(sig, 4):
                continue
            boiler.add(key)
        return boiler

    def run(self, ctx: ParseContext) -> ParseContext:
        layout = ctx.layout
        if layout is None or layout.page_count == 0:
            ctx.add(self.name, "warn", "no LayoutDocument")
            return ctx

        margin_lines = self._collect_margin_lines(layout)
        boiler = self._boilerplate_signatures(margin_lines, layout.page_count)
        if not boiler:
            ctx.add(self.name, "info", "no repeated header/footer detected")
            return ctx

        remove_ids: set[int] = set()
        removed_sigs: dict[str, int] = {}
        for pi, ln in margin_lines:
            key = (ln.band, ln.sig, ln.size)
            if key in boiler:
                for span in ln.spans:
                    remove_ids.add(id(span))
                removed_sigs[f"{ln.band}:{ln.sig}"] = removed_sigs.get(f"{ln.band}:{ln.sig}", 0) + 1

        removed = 0
        for page in layout.pages:
            kept = []
            for span in page.spans:
                if id(span) in remove_ids:
                    ctx.removed_spans.append(span)
                    removed += 1
                else:
                    kept.append(span)
            page.spans = kept

        ctx.add(
            self.name, "info",
            f"removed {removed} spans / {len(boiler)} boilerplate signatures "
            f"(e.g. {list(removed_sigs)[:3]})",
        )
        return ctx
