#!/usr/bin/env python3
"""
Build MVP Phase 1 databases from PDF source.
Requires: pypdf
"""
import json
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "source" / "past-exams" / "2018-2025.pdf"
DATA = ROOT / "data"
DOCS = ROOT / "docs"
ANALYSIS = DATA / "analysis"

EXAM_META = {
    2018: 29, 2019: 30, 2020: 31, 2021: 32,
    2022: 33, 2023: 34, 2024: 35, 2025: 36,
}

PRIMARY_INV = [
    "재고자산", "기말재고", "기초재고", "FOB", "선입선출", "가중평균", "이동평균",
    "실지재고조사", "소매재고", "순실현가능가치", "재고조사법", "재고원가",
    "재고자산평가", "재고자산감소", "매출원가법", "계속기록법",
]
EXCLUDE_PRIMARY = [
    "현금흐름", "생물자산", "전환사채", "확정급여", "주식선택권", "영업권",
    "결합원가", "활동기준원가", "공헌이익", "투자수익률", "실물자본유지",
    "당좌예금", "투자부동산", "법인세", "주당이익", "전환우선주",
]
COST_ONLY = ["재공품", "제조원가", "제조간접", "변동원가계산", "정상원가계산", "활동제조간접"]


def load_pages():
    reader = PdfReader(str(PDF))
    return [(i + 1, (p.extract_text() or "")) for i, p in enumerate(reader.pages)]


def build_page_year_map(pages, start_page, end_page):
    """Map page number -> exam year using footer headers."""
    mapping = {}
    current = None
    for page_num, text in pages:
        if page_num < start_page or page_num > end_page:
            continue
        m = re.search(r"(\d{4})년\s*제\d+회", text)
        if m:
            current = int(m.group(1))
        if m2 := re.search(r"(\d{4})년도\s*감정평가사", text):
            current = int(m2.group(1))
        if current:
            mapping[page_num] = current
    return mapping


def year_on_page(page_num, page_year_map, default=None):
    if page_num in page_year_map:
        return page_year_map[page_num]
    prior = [p for p in page_year_map if p <= page_num]
    return page_year_map[max(prior)] if prior else default


def is_inventory_core(text):
    t = re.sub(r"\s+", " ", text)
    stems = re.findall(r"[^?]+\?", t)
    stem = stems[-1] if stems else t[:250]

    exclude_stem = [
        "투자부동산", "생물자산", "현금흐름", "질적 특성", "개념체계", "유용한 재무정보",
        "당좌예금", "실물자본", "물가지수", "전환사채", "확정급여", "주식선택권",
        "원가계산", "결합원", "제조간접", "공헌이익", "투자수익률",
        "기계장치", "리스", "유형자산", "무형자산",
    ]
    if any(x in stem for x in exclude_stem):
        return False

    stem_inv = [
        "재고", "FOB", "선입", "가중평균", "이동평균", "소매재고", "순실현",
        "매출원가", "PER", "PR(", "재고조사", "기말재고", "기초재고", "FIFO",
    ]
    if any(k in stem for k in stem_inv):
        return True

    if "재고자산" in t and any(k in t for k in ["FOB", "기말", "매출원가", "선입", "가중평균", "실지재고", "순실현"]):
        return True
    if "FOB" in t and ("운송" in t or "선적" in t or "도착" in t):
        return True
    return False


def extract_choices(body):
    """Extract up to 5 choices; handles inline multi-choice lines."""
    flat = " ".join(ln.strip() for ln in body.split("\n") if ln.strip())
    symbols = ["①", "②", "③", "④", "⑤"]
    choices = []
    for i, sym in enumerate(symbols):
        nxt = "".join(re.escape(s) for s in symbols[i + 1:])
        tail = r"(?=\s*[" + nxt + r"]|\?|$)" if nxt else r"$"
        pat = rf"{re.escape(sym)}\s*(.+?){tail}"
        m = re.search(pat, flat)
        if m:
            val = m.group(1).strip()
            val = re.sub(r"\s+", " ", val)
            if val and len(val) < 400:
                choices.append(val)
    if len(choices) >= 4:
        return choices[:5]

    for line in body.split("\n"):
        m = re.match(r"^\s*[①②③④⑤]\s*(.+)", line)
        if m:
            choices.append(m.group(1).strip())
    return choices[:5]


def reconstruct_question_text(body):
    """Build originalQuestion from body, placing stem before choices when possible."""
    lines = [ln.strip() for ln in body.split("\n") if ln.strip()]
    # Remove duplicate consecutive lines
    dedup = []
    for ln in lines:
        if not dedup or dedup[-1] != ln:
            dedup.append(ln)
    return "\n".join(dedup)


def filter_inventory_table(mid):
    """Keep only transaction table lines from mixed column text."""
    keep = []
    for ln in mid.split("\n"):
        ln = ln.strip()
        if not ln:
            continue
        if re.search(r"(기초|매입|매출|일자|단가|수량|\d+월|\d+개|￦)", ln):
            keep.append(ln)
    return "\n".join(keep)


def find_nearby_choice_block(text, anchor_pos):
    """Find 5-choice block forward or backward from anchor (2-column PDF)."""
    fwd = re.search(
        r"(①.+?②.+?③.+?④.+?⑤.+?)(?:\n\n|\n\d{1,2}\n감정평가사|$)",
        text[anchor_pos : anchor_pos + 3500],
        re.DOTALL,
    )
    if fwd and len(extract_choices(fwd.group(1))) >= 4:
        return fwd.group(1)

    before = text[max(0, anchor_pos - 2500) : anchor_pos]
    matches = list(re.finditer(r"①.+?②.+?③.+?④.+?⑤", before, re.DOTALL))
    for cm in reversed(matches):
        block = cm.group(0)
        if len(extract_choices(block)) >= 4:
            return block
    return None


def recover_split_layout_questions(pages, page_year_map, q_end=169):
    """Recover inventory questions where 2-column layout splits stem and choices."""
    recovered = {}
    inv_stem = re.compile(
        r"(?<=\n)(\d{1,2})\n감정평가사\n"
        r"([^\n]+(?:재고|FOB|기말재고|선입선출|가중평균|매출원가|실지재고|순실현|PER)[^\n]*(?:\?|은\?|인\?|까\?|나\?))",
    )
    inv_table_hdr = re.compile(
        r"(?<=\n)(\d{1,2})\n감정평가사\n"
        r"((?:[^\n]+\n)*?(?:종목|실사수량|단위당|기초재고|일자 적요|매입|매출))",
        re.DOTALL,
    )
    inv_context = re.compile(
        r"([^\n]{0,120}(?:재고자산|기말재고|순실현|LCM|FOB)[^\n]{0,120}(?:\?|은\?|인\?|까\?|나\?))",
    )

    for page_num, text in pages:
        if page_num > q_end:
            continue
        year = year_on_page(page_num, page_year_map)
        if not year:
            continue

        candidates = []
        for sm in inv_stem.finditer(text):
            candidates.append((int(sm.group(1)), sm.start(), sm.group(2).strip(), "stem"))
        for tm in inv_table_hdr.finditer(text):
            candidates.append((int(tm.group(1)), tm.start(), tm.group(2).strip(), "table"))
        for cm in inv_context.finditer(text):
            if not is_inventory_core(cm.group(1)):
                continue
            hdrs = [h for h in re.finditer(r"(?<=\n)(\d{1,2})\n감정평가사\n", text[: cm.start()])]
            if hdrs:
                qnum = int(hdrs[-1].group(1))
                candidates.append((qnum, cm.start(), cm.group(1).strip(), "context"))

        seen = set()
        for qnum, pos, stem, kind in candidates:
            key = (year, qnum, kind)
            if key in seen:
                continue
            seen.add(key)

            choice_block = find_nearby_choice_block(text, pos)
            if not choice_block:
                continue

            choices = extract_choices(choice_block)
            if len(choices) < 4:
                continue

            mid = filter_inventory_table(text[pos : pos + 1200])
            parts = [stem]
            if mid and mid not in stem:
                parts.append(mid)
            parts.append(choice_block)
            body = "\n".join(parts)
            if not is_inventory_core(body):
                continue

            store = (year, qnum)
            if store not in recovered or len(choices) > len(recovered[store]["choices"]):
                recovered[store] = {
                    "year": year,
                    "round": EXAM_META.get(year),
                    "questionNumber": qnum,
                    "page": page_num,
                    "originalQuestion": reconstruct_question_text(body),
                    "stem": stem.split("\n")[0][:300],
                    "choices": choices,
                }
    return list(recovered.values())


def parse_questions(pages, page_year_map, q_end=169):
    by_key = {}

    for page_num, text in pages:
        if page_num > q_end:
            continue
        current_year = year_on_page(page_num, page_year_map)
        if not current_year:
            continue

        chunks = re.split(r"(?<=\n)(\d{1,2})\n감정평가사\n", text)
        if len(chunks) < 3:
            continue
        i = 1
        while i + 1 < len(chunks):
            qnum = int(chunks[i])
            body = chunks[i + 1]
            i += 2
            key = (current_year, qnum)
            if key not in by_key:
                by_key[key] = {"body": body.strip(), "page": page_num}
            else:
                by_key[key]["body"] = (by_key[key]["body"] + "\n" + body).strip()

    questions = []
    for (year, qnum), item in sorted(by_key.items()):
        body = item["body"]
        if not is_inventory_core(body):
            continue
        choices = extract_choices(body)
        original = reconstruct_question_text(body)
        stems = re.findall(r"[^?\n]+\?", original)
        stem = stems[-1].strip() if stems else original[:300]
        questions.append({
            "year": year,
            "round": EXAM_META.get(year),
            "questionNumber": qnum,
            "page": item["page"],
            "originalQuestion": original,
            "stem": stem,
            "choices": choices,
        })

    recovered = recover_split_layout_questions(pages, page_year_map, q_end)
    by_q = {(q["year"], q["questionNumber"]): q for q in questions}
    for rq in recovered:
        key = (rq["year"], rq["questionNumber"])
        existing = by_q.get(key)
        if not existing or len(rq["choices"]) > len(existing["choices"]):
            by_q[key] = rq
    return list(by_q.values())


def parse_solutions(pages, page_year_map, sol_start=170):
    """Parse solutions: sequential Q1..Q40 per exam year (multi-column safe)."""
    solutions = {}
    circ = {"①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5}
    by_year = defaultdict(list)

    for page_num, text in pages:
        if page_num < sol_start:
            continue
        current_year = year_on_page(page_num, page_year_map)
        if not current_year:
            continue
        for m in re.finditer(r"정답\s*[：:]\s*([①②③④⑤])", text):
            ans = circ.get(m.group(1))
            if not ans:
                continue
            seg_start = max(0, m.start() - 1200)
            by_year[current_year].append({
                "answer": ans,
                "solutionText": text[seg_start : m.end() + 100].strip()[:5000],
                "solutionPage": page_num,
            })

    for year, items in sorted(by_year.items()):
        if len(items) > 40:
            print(f"WARN {year}: {len(items)} answers, using first 40")
            items = items[:40]
        for qnum, item in enumerate(items, 1):
            solutions[(year, qnum)] = item
    return solutions


def classify_pattern(q):
    t = q["originalQuestion"]
    if any(k in t for k in ["FOB", "선적", "도착지", "운송 중", "위탁", "시송", "적송", "기말재고에 포함", "재고자산은?"]):
        if "매출원가" not in t[:80] and "선입선출" not in t and "가중평균" not in t:
            return "ACC_INV_001"
    if "FOB" in t or "CIF" in t:
        return "ACC_INV_002"
    if any(k in t for k in ["운반", "하역", "보험료", "부대비용", "매입할인", "매입세"]):
        return "ACC_INV_003"
    if any(k in t for k in ["PER", "PR(", "실지 재고", "주기적 재고", "재고조사법"]):
        if "선입" in t or "FIFO" in t or "평균" in t:
            pass
        else:
            return "ACC_INV_005"
    if any(k in t for k in ["선입선출", "FIFO", "가중평균", "이동평균", "총평균", "기초재고", "매출원가"]):
        if "소매재고" in t:
            return "ACC_INV_007"
        return "ACC_INV_006" if any(k in t for k in ["선입", "FIFO", "평균", "단가"]) else "ACC_INV_004"
    if any(k in t for k in ["순실현", "LCM", "저가", "소매재고", "순매가"]):
        return "ACC_INV_007"
    if any(k in t for k in ["재고자산에 관한", "재고자산의 정의", "회계정책", "분개"]):
        return "ACC_INV_008"
    if "재고자산" in t:
        return "ACC_INV_004"
    return "ACC_INV_001"


PATTERN_NAMES = {
    "ACC_INV_001": "기말재고 포함 여부 판단",
    "ACC_INV_002": "FOB/CIF 조건에 따른 재고 귀속",
    "ACC_INV_003": "운반비·부대비용과 재고원가",
    "ACC_INV_004": "매출원가 계산 (PER법)",
    "ACC_INV_005": "PER vs PR 재고조사법",
    "ACC_INV_006": "FIFO·총평균법 매출원가",
    "ACC_INV_007": "LCM·순실현가능가치 평가",
    "ACC_INV_008": "재고자산 개념·회계처리",
}


def build_solution_obj(text, answer):
    algo = ""
    if text:
        lines = [ln.strip() for ln in text.split("\n") if ln.strip() and not ln.strip().startswith("정답")]
        algo = " → ".join(lines[:6])
    return {
        "summary": lines[0] if text and (lines := [ln for ln in text.split("\n") if ln.strip()]) else "",
        "algorithm": algo[:1500],
        "calculationProcess": text[:2000] if text else "",
        "explanation": text[:2500] if text else "",
        "steps": [],
        "wrongAnalysis": [],
        "memoryPoint": "",
    }


def generate_docs(questions, patterns, statistics, master):
    """Write exam-analysis, pattern-db, statistics markdown docs."""
    DOCS.mkdir(exist_ok=True)

    by_year = defaultdict(list)
    for q in questions:
        by_year[q["year"]].append(q)

    exam_md = [
        "# 기출 분석 (Phase 1 — PDF 검증)",
        "",
        "## 분석 범위",
        "",
        f"- **원본**: `{master['metadata']['sourceFile']}`",
        f"- **분석일**: {master['metadata']['analysisDate']}",
        f"- **문제 영역**: p.6 ~ p.169",
        f"- **해설 영역**: p.170 ~ p.289",
        f"- **연도**: 2018(제29회) ~ 2025(제36회)",
        f"- **과목**: 회계학 — 재고자산",
        "",
        "## 추출 결과",
        "",
        f"- **검증 완료 문항**: {len(questions)}",
        f"- **Pattern 수**: {len(patterns)}",
        "",
        "## 연도별 문항",
        "",
        "| 연도 | 회차 | 문항 수 | 문항 번호 |",
        "|------|------|---------|-----------|",
    ]
    for year in sorted(by_year.keys()):
        nums = sorted(q["source"]["questionNumber"] for q in by_year[year])
        exam_md.append(f"| {year} | 제{EXAM_META.get(year)}회 | {len(nums)} | {', '.join(map(str, nums))} |")
    exam_md.extend(["", "## Pattern 분포", ""])
    for p in patterns:
        exam_md.append(f"- **{p['patternId']}** ({p['name']}): {p['frequency']}문항, {p['years']}")
    exam_md.extend(["", "## 검증 기준", "",
                    "- PDF 원문에서 문제·해설 번호 매칭",
                    "- `source.type`: past_exam (PDF 검증 후)",
                    "- `originalQuestion` 필드에 PDF 원문 보존",
                    "- `source.page`, `source.solutionPage` 기록",
                    ""])
    (DOCS / "exam-analysis.md").write_text("\n".join(exam_md), encoding="utf-8")

    pattern_md = [
        "# Pattern DB (재고자산)",
        "",
        f"총 {len(patterns)}개 Pattern, {len(questions)}문항 기준.",
        "",
        "| Pattern ID | 이름 | 등급 | 빈도 | 출제 연도 |",
        "|------------|------|------|------|-----------|",
    ]
    for p in patterns:
        yrs = ", ".join(str(y) for y in p["years"])
        pattern_md.append(f"| {p['patternId']} | {p['name']} | {p['grade']} | {p['frequency']} | {yrs} |")
    pattern_md.extend(["", "## Pattern 상세", ""])
    for p in patterns:
        pattern_md.extend([
            f"### {p['patternId']}: {p['name']}",
            f"- **빈도**: {p['frequency']} (실제 기출 문항 수)",
            f"- **등급**: {p['grade']}",
            f"- **출제 연도**: {', '.join(str(y) for y in p['years'])}",
            f"- **관련 문항**: {', '.join(p['relatedQuestions'])}",
            "",
        ])
    (DOCS / "pattern-db.md").write_text("\n".join(pattern_md), encoding="utf-8")

    stat_md = [
        "# Statistics (재고자산 Pattern)",
        "",
        "question-db.json 기준 자동 생성.",
        "",
        "| Pattern | 총 출제 | 최근(2022+) | 우선순위 | 등급 |",
        "|---------|---------|-------------|----------|------|",
    ]
    for s in statistics:
        recent = ", ".join(str(y) for y in s["recentYears"]) or "-"
        stat_md.append(f"| {s['patternId']} | {s['totalCount']} | {recent} | {s['priority']} | {s['grade']} |")
    stat_md.extend([
        "",
        f"**총 문항**: {len(questions)}",
        f"**연도 커버리지**: {master['summary']['yearCoverage']}",
        "",
    ])
    (DOCS / "statistics.md").write_text("\n".join(stat_md), encoding="utf-8")


def main():
    print("Loading PDF...")
    pages = load_pages()
    print(f"Pages: {len(pages)}")

    q_year_map = build_page_year_map(pages, 6, 169)
    sol_year_map = build_page_year_map(pages, 170, 289)
    page_year_map = {**q_year_map, **sol_year_map}
    print(f"Year map entries: Q={len(q_year_map)}, Sol={len(sol_year_map)}")

    questions_raw = parse_questions(pages, q_year_map)
    solutions = parse_solutions(pages, sol_year_map)
    print(f"Inventory questions: {len(questions_raw)}")
    print(f"Solutions indexed: {len(solutions)}")

    questions = []
    for idx, q in enumerate(sorted(questions_raw, key=lambda x: (x["year"], x["questionNumber"])), 1):
        key = (q["year"], q["questionNumber"])
        sol = solutions.get(key, {})
        if not sol.get("answer"):
            print(f"WARN no answer: {key}")
            continue
        if len(q["choices"]) < 4:
            print(f"WARN choices<{4}: {key}")
            continue
        pid = classify_pattern(q)
        qid = f"ACC_INV_Q{idx:03d}"
        questions.append({
            "questionId": qid,
            "year": q["year"],
            "subjectId": "ACC",
            "chapterId": "ACC_INV",
            "patternId": pid,
            "difficulty": "medium",
            "originalQuestion": q["originalQuestion"],
            "question": q["stem"],
            "choices": q["choices"],
            "answer": sol["answer"],
            "source": {
                "type": "past_exam",
                "examId": "APPRAISER",
                "year": q["year"],
                "round": 1,
                "examRound": q["round"],
                "questionNumber": q["questionNumber"],
                "sourceFile": "source/past-exams/2018-2025.pdf",
                "page": q["page"],
                "solutionPage": sol.get("solutionPage"),
            },
            "solution": build_solution_obj(sol.get("solutionText", ""), sol["answer"]),
        })

    print(f"Verified questions: {len(questions)}")

    # Patterns from questions
    pattern_map = defaultdict(list)
    for q in questions:
        pattern_map[q["patternId"]].append(q)

    patterns = []
    for pid in sorted(pattern_map.keys()):
        qs = pattern_map[pid]
        years = sorted({q["year"] for q in qs})
        patterns.append({
            "patternId": pid,
            "subjectId": "ACC",
            "chapterId": "ACC_INV",
            "name": PATTERN_NAMES.get(pid, pid),
            "grade": "S" if len(qs) >= 4 else "A" if len(qs) >= 2 else "B",
            "frequency": len(qs),
            "years": years,
            "importance": min(95, 60 + len(qs) * 5),
            "relatedQuestions": [q["questionId"] for q in qs],
        })

    # Statistics auto from questions
    statistics = []
    for p in patterns:
        recent = [y for y in p["years"] if y >= 2022]
        statistics.append({
            "patternId": p["patternId"],
            "chapterId": "ACC_INV",
            "totalCount": p["frequency"],
            "years": p["years"],
            "recentYears": recent,
            "priority": "HIGH" if p["grade"] == "S" else "MEDIUM" if p["grade"] == "A" else "LOW",
            "grade": p["grade"],
        })

    master = {
        "version": "1.0",
        "exam": {
            "examId": "APPRAISER",
            "name": "감정평가사",
            "description": "전문자격시험 1차",
            "years": list(range(2018, 2026)),
        },
        "subjects": [{"subjectId": "ACC", "name": "회계학", "examId": "APPRAISER", "template": "accounting", "order": 1}],
        "chapters": [{
            "chapterId": "ACC_INV",
            "subjectId": "ACC",
            "name": "재고자산",
            "grade": "S",
            "order": 1,
            "patternIds": [p["patternId"] for p in patterns],
        }],
        "metadata": {
            "sourceFile": "source/past-exams/2018-2025.pdf",
            "analysisVersion": "2.0",
            "analysisDate": str(date.today()),
            "pdfVerified": True,
            "mvpPhase": 1,
            "scope": "회계학 - 재고자산 (PDF 추출)",
        },
        "summary": {
            "totalPatterns": len(patterns),
            "totalQuestions": len(questions),
            "yearCoverage": sorted({q["year"] for q in questions}),
        },
    }

    DATA.mkdir(exist_ok=True)
    (DATA / "master-db.json").write_text(json.dumps(master, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "pattern-db.json").write_text(json.dumps(patterns, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "question-db.json").write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "statistics.json").write_text(json.dumps(statistics, ensure_ascii=False, indent=2), encoding="utf-8")

    ANALYSIS.mkdir(parents=True, exist_ok=True)
    (ANALYSIS / "phase1-build-summary.json").write_text(json.dumps({
        "questions": len(questions),
        "patterns": len(patterns),
        "byYear": {str(y): len([q for q in questions if q["year"] == y]) for y in range(2018, 2026)},
        "byPattern": {p["patternId"]: p["frequency"] for p in patterns},
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    generate_docs(questions, patterns, statistics, master)

    print("Done.", len(questions), "questions", len(patterns), "patterns")


if __name__ == "__main__":
    main()
