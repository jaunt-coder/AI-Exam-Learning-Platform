from __future__ import annotations

import hashlib
import io
import re
from dataclasses import dataclass
from pathlib import Path

import fitz
from pypdf import PdfReader

from .constants import SOURCE_DIR
from .year_discovery import resolve_exam_source_for_year


@dataclass
class LoadedDocument:
    text: str
    pages: list[str]
    source_path: Path
    source_kind: str
    used_ocr: bool
    page_count: int


def resolve_exam_source(year: int) -> tuple[Path | None, str | None]:
    info = resolve_exam_source_for_year(year, SOURCE_DIR)
    return info.path, info.kind


def _file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def _ocr_pdf(path: Path, cache_dir: Path) -> tuple[str, list[str]]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{path.stem}-{_file_hash(path)}.txt"
    if cache_file.exists():
        text = cache_file.read_text(encoding="utf-8")
        pages = text.split("\f")
        return text, pages

    import easyocr

    reader = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    doc = fitz.open(str(path))
    pages: list[str] = []
    for page in doc:
        pix = page.get_pixmap(dpi=180)
        img_bytes = pix.tobytes("png")
        lines = reader.readtext(img_bytes, detail=0, paragraph=True)
        page_text = "\n".join(lines)
        pages.append(page_text)
    doc.close()
    full = "\f".join(pages)
    cache_file.write_text(full, encoding="utf-8")
    return full, pages


def _read_hwp(path: Path) -> tuple[str, list[str], bool]:
    from hwp5.filestructure import Hwp5File
    from hwp5.hwp5txt import TextTransform

    hwp = Hwp5File(str(path))
    distributable = bool(getattr(hwp.header.flags, "distributable", 0))
    if distributable:
        preview = ""
        try:
            preview = hwp.preview_text.open().read().decode("utf-16le", errors="replace")
            preview = re.sub(r"<[^>]+>", "\n", preview)
            preview = re.sub(r"\n{2,}", "\n", preview).strip()
        except OSError:
            preview = ""
        if "회계학" in preview or re.search(r"\b41\.", preview):
            pages = preview.split("\f") if "\f" in preview else [preview]
            return preview, pages, False
        raise ValueError("배포용 HWP — 본문 추출 불가")

    transform = TextTransform().transform_hwp5_to_text
    buffer = io.BytesIO()
    transform(hwp, buffer)
    text = buffer.getvalue().decode("utf-8", errors="replace")
    text = text.replace("<표>", "\n[TABLE]\n").replace("<그림>", "\n[FIGURE]\n")
    pages = text.split("\f") if "\f" in text else [text]
    return text, pages, False


def _read_pdf(path: Path, cache_dir: Path) -> tuple[str, list[str], bool]:
    doc = fitz.open(str(path))
    pages = [(page.get_text() or "") for page in doc]
    doc.close()
    full = "\n".join(pages)
    if full.strip():
        return full, pages, False
    full, pages = _ocr_pdf(path, cache_dir)
    return full, pages, True


def load_exam_document(year: int, cache_dir: Path) -> LoadedDocument:
    path, kind = resolve_exam_source(year)
    if not path or not kind:
        raise FileNotFoundError(f"{year}년 원본 시험지 없음")

    used_ocr = False
    if kind == "hwp":
        text, pages, used_ocr = _read_hwp(path)
    else:
        text, pages, used_ocr = _read_pdf(path, cache_dir)

    return LoadedDocument(
        text=text,
        pages=pages,
        source_path=path,
        source_kind=kind,
        used_ocr=used_ocr,
        page_count=len(pages),
    )
