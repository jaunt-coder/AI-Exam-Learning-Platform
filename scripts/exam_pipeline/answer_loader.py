from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import cv2
import fitz
import numpy as np
from pypdf import PdfReader

from .constants import ACC_END, ACC_START, ANSWERS_DIR, EXPECTED_ACC_COUNT


def _find_answer_file(year: int) -> Path | None:
    json_path = ANSWERS_DIR / f"{year}.json"
    if json_path.exists():
        return json_path
    candidates: list[Path] = []
    for path in ANSWERS_DIR.iterdir():
        if not path.is_file():
            continue
        name = path.name
        if str(year) in name and path.suffix.lower() in {".json", ".hwp", ".pdf"}:
            candidates.append(path)
    if not candidates:
        return None
    for path in candidates:
        if path.suffix.lower() == ".json":
            return path
    return sorted(candidates, key=lambda p: len(p.name))[0]


def _parse_answer_json(path: Path) -> dict[int, int]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    answers: dict[int, int] = {}
    for key, value in payload.items():
        if str(key).startswith("_"):
            continue
        number = int(key)
        if ACC_START <= number <= ACC_END and value is not None:
            answers[number] = int(value)
    return answers


def _read_image(path: Path):
    data = np.fromfile(str(path), dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR)


def _ocr_image(reader, image_path: Path | str) -> str:
    img = _read_image(Path(image_path))
    if img is None:
        return ""
    lines = reader.readtext(img, detail=0, paragraph=True)
    return "\n".join(lines)


def _ocr_answer_pdf(path: Path) -> str:
    import easyocr

    reader = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    doc = fitz.open(str(path))
    chunks: list[str] = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        temp = path.parent / f".ocr-{path.stem}-{page.number}.png"
        pix.save(str(temp))
        chunks.append(_ocr_image(reader, temp))
        temp.unlink(missing_ok=True)
    doc.close()
    return "\n".join(chunks)


def _extract_accounting_section(text: str) -> str:
    block_match = re.search(
        r"2교시\s*A[^\n]*([\s\S]*?)(?=2교시\s*B|한국산업|$)",
        text,
    )
    block = block_match.group(0) if block_match else text
    acc_match = re.search(r"회계\s*학", block)
    if not acc_match:
        return block
    section = block[acc_match.start() :]
    stop = re.search(r"한국산업|2교시\s*B", section[5:])
    if stop:
        section = section[: 5 + stop.start()]
    return section


def _parse_pair_answers(section: str) -> dict[int, int]:
    answers: dict[int, int] = {}
    for match in re.finditer(
        r"(?<![0-9])(4[1-9]|[1-6]\d|7[0-9]|80)[\s\.]+([1-5])(?![0-9])",
        section,
    ):
        answers[int(match.group(1))] = int(match.group(2))
    return answers


def _parse_vertical_answers(section: str) -> dict[int, int]:
    numbers = [int(value) for value in re.findall(r"\b(\d{1,3})\b", section)]
    start_idx = next((idx for idx, num in enumerate(numbers) if num == ACC_START), None)
    if start_idx is None:
        return {}

    answers: dict[int, int] = {}
    idx = start_idx + 1
    expected = ACC_START
    if numbers[start_idx] == ACC_START and idx < len(numbers) and 1 <= numbers[idx] <= 5:
        answers[ACC_START] = numbers[idx]
        expected = ACC_START + 1
        idx += 1

    while idx < len(numbers) and expected <= ACC_END:
        num = numbers[idx]
        if num == expected:
            if idx + 1 < len(numbers) and 1 <= numbers[idx + 1] <= 5:
                answers[expected] = numbers[idx + 1]
                expected += 1
                idx += 2
            else:
                idx += 1
        elif 1 <= num <= 5 and expected not in answers:
            answers[expected] = num
            expected += 1
            idx += 1
        elif expected < num <= ACC_END:
            expected = num
            idx += 1
        else:
            idx += 1
    return answers


def _parse_compact_digits(raw: str) -> dict[int, int]:
    digits = re.sub(r"[^0-9]", "", raw)
    best: dict[int, int] = {}
    for offset in range(4):
        answers: dict[int, int] = {}
        index = offset
        while index < len(digits):
            matched = False
            if index + 2 <= len(digits):
                question = int(digits[index : index + 2])
                if ACC_START <= question <= ACC_END and index + 2 < len(digits):
                    answer = int(digits[index + 2])
                    if 1 <= answer <= 5:
                        answers[question] = answer
                        index += 3
                        matched = True
            if not matched:
                index += 1
        if len(answers) > len(best):
            best = answers
    return best


def _parse_answer_text(text: str) -> dict[int, int]:
    if not text.strip():
        return {}

    section = _extract_accounting_section(text)
    merged: dict[int, int] = {}
    for parser in (_parse_pair_answers, _parse_vertical_answers):
        merged.update(parser(section))

    if len(merged) >= 30:
        return {key: merged[key] for key in sorted(merged) if ACC_START <= key <= ACC_END}

    normalized = text.replace("회계학", " ")
    numbers = [int(num) for num in re.findall(r"\b(\d{1,3})\b", normalized)]
    start_idx = next((idx for idx, num in enumerate(numbers) if num == ACC_START), None)
    if start_idx is not None:
        merged.update(_parse_vertical_answers(" ".join(str(num) for num in numbers[start_idx:])))

    return {key: merged[key] for key in sorted(merged) if ACC_START <= key <= ACC_END}


def _ocr_answer_hwp(path: Path, cache_dir: Path, year: int) -> str:
    import easyocr
    from hwp5.filestructure import Hwp5File
    from hwp5.hwp5html import HTMLTransform

    reader = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    bindata_dir = cache_dir / f"answer-bindata-{year}"
    if bindata_dir.exists():
        shutil.rmtree(bindata_dir)
    bindata_dir.mkdir(parents=True, exist_ok=True)

    hwp = Hwp5File(str(path))
    HTMLTransform().extract_bindata_dir(hwp, str(bindata_dir))

    chunks: list[str] = []
    for image_path in sorted(bindata_dir.glob("*.bmp")):
        img = _read_image(image_path)
        if img is None:
            continue
        height, width = img.shape[:2]
        crop = img[int(height * 0.45) :, :]
        enlarged = cv2.resize(crop, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
        temp = bindata_dir / f"{image_path.stem}-ocr.png"
        ok, encoded = cv2.imencode(".png", enlarged)
        if ok:
            encoded.tofile(str(temp))
        chunks.append(_ocr_image(reader, temp))

        gray = cv2.cvtColor(enlarged, cv2.COLOR_BGR2GRAY)
        _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        horiz = cv2.erode(bw, cv2.getStructuringElement(cv2.MORPH_RECT, (50, 1)), iterations=1)
        horiz = cv2.dilate(horiz, cv2.getStructuringElement(cv2.MORPH_RECT, (50, 1)), iterations=2)
        projection = np.sum(horiz, axis=1)
        rows: list[tuple[int, int]] = []
        in_line = False
        start = 0
        for index, value in enumerate(projection):
            if value > enlarged.shape[1] * 0.15 and not in_line:
                start = index
                in_line = True
            elif value <= enlarged.shape[1] * 0.15 and in_line:
                if index - start > 10:
                    rows.append((start, index))
                in_line = False

        for row_start, row_end in rows:
            row_img = enlarged[row_start:row_end, :]
            row_text = "".join(reader.readtext(row_img, detail=0, paragraph=False)).strip()
            if row_text:
                chunks.append(row_text)

    return "\n".join(chunks)


def _parse_hwp_grid_answers(path: Path, cache_dir: Path, year: int) -> dict[int, int]:
    import easyocr
    from hwp5.filestructure import Hwp5File
    from hwp5.hwp5html import HTMLTransform

    reader = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    bindata_dir = cache_dir / f"answer-grid-{year}"
    if bindata_dir.exists():
        shutil.rmtree(bindata_dir)
    bindata_dir.mkdir(parents=True, exist_ok=True)

    hwp = Hwp5File(str(path))
    HTMLTransform().extract_bindata_dir(hwp, str(bindata_dir))

    merged: dict[int, int] = {}
    for image_path in sorted(bindata_dir.glob("*.bmp")):
        text = _ocr_image(reader, image_path)
        if "2교시" in text and "A" in text:
            merged.update(_parse_compact_digits(text))
            merged.update(_parse_answer_text(text))

        img = _read_image(image_path)
        if img is None:
            continue
        height = img.shape[0]
        crop = img[int(height * 0.52) :, :]
        enlarged = cv2.resize(crop, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
        gray = cv2.cvtColor(enlarged, cv2.COLOR_BGR2GRAY)
        _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        horiz = cv2.erode(bw, cv2.getStructuringElement(cv2.MORPH_RECT, (50, 1)), iterations=1)
        horiz = cv2.dilate(horiz, cv2.getStructuringElement(cv2.MORPH_RECT, (50, 1)), iterations=2)
        projection = np.sum(horiz, axis=1)
        rows: list[tuple[int, int]] = []
        in_line = False
        start = 0
        for index, value in enumerate(projection):
            if value > enlarged.shape[1] * 0.15 and not in_line:
                start = index
                in_line = True
            elif value <= enlarged.shape[1] * 0.15 and in_line:
                if index - start > 10:
                    rows.append((start, index))
                in_line = False

        for row_start, row_end in rows:
            row_text = "".join(
                reader.readtext(enlarged[row_start:row_end, :], detail=0, paragraph=False)
            ).strip()
            merged.update(_parse_compact_digits(row_text))

    return {key: merged[key] for key in sorted(merged) if ACC_START <= key <= ACC_END}


def _extract_text_from_answer_file(path: Path, cache_dir: Path, year: int) -> str:
    suffix = path.suffix.lower()
    if suffix == ".json":
        return ""
    if suffix == ".pdf":
        reader = PdfReader(str(path))
        text = "".join((page.extract_text() or "") for page in reader.pages)
        if text.strip():
            return text
        return _ocr_answer_pdf(path)
    if suffix == ".hwp":
        text = ""
        try:
            from hwp5.hwp5txt import TextTransform
            from hwp5.filestructure import Hwp5File
            import io

            hwp = Hwp5File(str(path))
            transform = TextTransform().transform_hwp5_to_text
            buffer = io.BytesIO()
            transform(hwp, buffer)
            text = buffer.getvalue().decode("utf-8", errors="replace")
        except Exception:
            text = ""
        if len(text.strip()) > 120 and "그림" not in text and "<표>" not in text:
            return text
        return _ocr_answer_hwp(path, cache_dir, year)
    return ""


def load_accounting_answers(year: int, cache_dir: Path | None = None) -> dict[int, int]:
    path = _find_answer_file(year)
    if not path:
        return {}
    if path.suffix.lower() == ".json":
        return _parse_answer_json(path)

    cache_dir = cache_dir or (ANSWERS_DIR / ".cache")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"answers-{year}.json"
    if cache_file.exists():
        cached = _parse_answer_json(cache_file)
        if cached:
            return cached

    answers: dict[int, int] = {}
    if path.suffix.lower() == ".hwp":
        answers.update(_parse_hwp_grid_answers(path, cache_dir, year))

    if len(answers) < EXPECTED_ACC_COUNT:
        text = _extract_text_from_answer_file(path, cache_dir, year)
        if not text.strip() and path.suffix.lower() == ".pdf":
            text = _ocr_answer_pdf(path)
        answers.update(_parse_answer_text(text))

    if answers:
        payload = {str(key): value for key, value in sorted(answers.items())}
        cache_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        target_json = ANSWERS_DIR / f"{year}.json"
        if not target_json.exists() or len(_parse_answer_json(target_json)) < len(answers):
            target_json.write_text(cache_file.read_text(encoding="utf-8"), encoding="utf-8")
    return {key: answers[key] for key in sorted(answers) if ACC_START <= key <= ACC_END}
