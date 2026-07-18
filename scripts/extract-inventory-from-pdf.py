#!/usr/bin/env python3
"""
Extract 재고자산 (inventory) questions from 감정평가사 회계학 PDF.
Outputs: analysis JSON + raw extraction for review.
"""
import json
import re
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = ROOT / "source" / "past-exams" / "2018-2025.pdf"
OUT_DIR = ROOT / "data" / "analysis"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Financial accounting inventory keywords (exclude pure cost accounting)
INV_STRONG = [
    "재고자산", "기말재고", "기초재고", "FOB", "선입선출", "가중평균",
    "실지재고조사", "소매재고", "순실현가능가치", "저가법", "LCM",
    "매출원가법", "재고자산평가", "재고자산감소", "재고자산의 정의",
    "재고원가", "재고조사법", "PER(", "PR(", "주기적 재고", "실지 재고",
]
INV_WEAK = ["매출원가", "상품재고", "재고의", "재고를", "재고에", "재고가"]
COST_EXCLUDE = [
    "원가계산", "제조원가", "재공품", "결합원가", "활동기준", "변동원가",
    "정상원가", "제조간접", "직접노무", "공헌이익", "투자수익률",
    "실물자본유지", "물가지수",
]


def extract_pages():
    reader = PdfReader(str(PDF_PATH))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append({"page": i, "text": text})
    return pages


def find_year_sections(full_text):
    """Find year markers in document."""
    years = []
    for m in re.finditer(
        r"(\d{4})년\s*(?:제(\d+)회|도\s*감정평가사)", full_text
    ):
        years.append({"year": int(m.group(1)), "round": int(m.group(2)) if m.group(2) else None, "pos": m.start()})
    return years


def is_inventory_question(text):
    t = text.replace("\n", " ")
    if any(x in t for x in COST_EXCLUDE):
        # Allow if strong inventory terms dominate
        if not any(x in t for x in ["재고자산", "기말재고", "FOB", "선입선출", "가중평균", "실지재고", "소매재고", "순실현가능", "재고조사법"]):
            if "재고" in t and ("재공품" in t or "제품" in t and "원가" in t):
                return False
    score = sum(1 for k in INV_STRONG if k in t)
    if score >= 1:
        return True
    if any(k in t for k in INV_WEAK) and "재고자산" in t:
        return True
    if "재고자산" in t:
        return True
    if re.search(r"기말\s*재고|기초\s*재고", t):
        return True
    if "FOB" in t and ("매입" in t or "판매" in t or "선적" in t or "운송" in t):
        return True
    return False


def parse_questions_from_pages(pages, start_page=1, end_page=170):
    """Parse numbered questions from question section."""
    questions = []
    current_year = None
    current_round = None

    for pg in pages:
        if pg["page"] < start_page or pg["page"] > end_page:
            continue
        text = pg["text"]

        # Update year from header
        ym = re.search(r"(\d{4})년\s*제(\d+)회", text)
        if ym:
            current_year = int(ym.group(1))
            current_round = int(ym.group(2))
        ym2 = re.search(r"(\d{4})년도\s*감정평가사", text)
        if ym2:
            current_year = int(ym2.group(1))

        # Split by question number markers
        parts = re.split(r"(?<=\n)(\d{1,2})\n감정평가사\n", text)
        if len(parts) < 2:
            continue

        prefix = parts[0]
        i = 1
        while i + 1 < len(parts):
            qnum = int(parts[i])
            body = parts[i + 1]
            i += 2

            # Extract choices
            choices = re.findall(r"[①②③④⑤]\s*([^\n①②③④⑤]+)", body)
            # Question stem: before first choice or first ①
            stem_match = re.split(r"[①②③④⑤]", body, maxsplit=1)
            stem = stem_match[0].strip() if stem_match else body.strip()

            full_q = stem + "\n" + body
            if not is_inventory_question(full_q):
                continue

            questions.append({
                "year": current_year,
                "round": current_round,
                "questionNumber": qnum,
                "page": pg["page"],
                "stem": stem[:2000],
                "body": body[:3000],
                "choices": [c.strip() for c in choices[:5]],
                "fullText": full_q[:4000],
            })

    return questions


def parse_solutions(pages, start_page=170):
    """Parse solution section for 정답 markers."""
    solutions = {}
    current_year = None
    current_qnum = None
    buffer = []

    for pg in pages:
        if pg["page"] < start_page:
            continue
        text = pg["text"]

        ym = re.search(r"(\d{4})년\s*제(\d+)회", text)
        if ym:
            current_year = int(ym.group(1))

        # Question number in solution section
        for m in re.finditer(r"(?<=\n)(\d{1,2})\n감정평가사\n", text):
            current_qnum = int(m.group(1))

        # Collect answer
        for m in re.finditer(r"정답\s*[：:]\s*[①②③④⑤](\d)?|정답\s*[：:]\s*(\d)", text):
            ans_raw = m.group(0)
            ans_num = None
            circled = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
            for k, v in circled.items():
                if k in ans_raw:
                    ans_num = v
                    break
            if ans_num is None:
                dm = re.search(r"(\d)", ans_raw)
                if dm:
                    ans_num = int(dm.group(1))

            if current_year and current_qnum and ans_num:
                key = f"{current_year}-{current_qnum}"
                # Get surrounding solution text
                idx = text.find(m.group(0))
                sol_text = text[max(0, idx - 800): idx + 200]
                solutions[key] = {
                    "year": current_year,
                    "questionNumber": current_qnum,
                    "answer": ans_num,
                    "solutionText": sol_text.strip(),
                    "page": pg["page"],
                }

    return solutions


def main():
    print("Extracting PDF pages...")
    pages = extract_pages()
    print(f"Total pages: {len(pages)}")

    questions = parse_questions_from_pages(pages)
    print(f"Inventory questions found (raw): {len(questions)}")

    # Deduplicate by year+questionNumber
    seen = set()
    unique = []
    for q in questions:
        key = (q["year"], q["questionNumber"])
        if key in seen or q["year"] is None:
            continue
        seen.add(key)
        unique.append(q)

    print(f"Unique inventory questions: {len(unique)}")

    solutions = parse_solutions(pages)

    # Match
    matched = []
    for q in unique:
        key = f"{q['year']}-{q['questionNumber']}"
        sol = solutions.get(key, {})
        matched.append({**q, "answer": sol.get("answer"), "solutionText": sol.get("solutionText", ""), "solutionPage": sol.get("page")})

    out = {
        "sourceFile": "source/past-exams/2018-2025.pdf",
        "totalPages": len(pages),
        "inventoryQuestionCount": len(matched),
        "questions": matched,
    }

    out_path = OUT_DIR / "inventory-extraction-raw.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Written: {out_path}")

    # Summary by year
    by_year = {}
    for q in matched:
        y = q["year"]
        by_year.setdefault(y, []).append(q["questionNumber"])
    print("By year:", json.dumps(by_year, ensure_ascii=False))


if __name__ == "__main__":
    main()
