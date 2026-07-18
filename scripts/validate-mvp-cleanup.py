#!/usr/bin/env python3
"""Validate Phase 1.6 MVP display cleanup layer (read-only on source DB)."""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
JS = ROOT / "js"
QUESTION_DB = DATA / "question-db-mvp.json"
REPORT_PATH = ROOT / "docs" / "mvp-cleanup-report.md"

EXPECTED_TOTAL = 240
SAMPLE_SIZE = 20

FOOTER_PATTERNS = [
    re.compile(r"\n?\s*A-\d{2}-\d{1,2}(?:-\[\d교시\])?\s*", re.I),
    re.compile(r"\n?\s*A-\d{2}-\d{1,2}-\[\d교시\]\s*", re.I),
    re.compile(r"\n?\s*교시\s*-\[\s*\d\s*\]\s*", re.I),
    re.compile(r"\n?\s*한국산업[^\n]*", re.I),
    re.compile(r"\n?\s*page\s*\(\s*\d+\s*\)\s*", re.I),
    re.compile(r"\n?\s*제\d+회[^\n]*", re.I),
    re.compile(r"\n?\s*청렴한감정평가[^\n]*", re.I),
    re.compile(r"\n?\s*\d{4}년\s*제\d+회[^\n]*A-\d{2}-\d{1,2}\s*", re.I),
]
CHOICE_SYMBOLS = re.compile(r"[①②③④⑤]")
EXCESS_NEWLINES = re.compile(r"\n{3,}")
NUMBER_TOKEN = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?")
CURRENCY_TOKEN = re.compile(r"W\d{1,3}(?:,\d{3})+(?:\.\d+)?", re.I)


def make_token_placeholder(index: int) -> str:
    return f"@@N{chr(0xE000 + index)}@@"


def protect_numeric_tokens(text: str) -> tuple[str, list[str]]:
    tokens: list[str] = []

    def replacer(match: re.Match[str]) -> str:
        tokens.append(match.group(0).replace(" ", ""))
        return make_token_placeholder(len(tokens) - 1)

    value = CURRENCY_TOKEN.sub(replacer, text)
    value = NUMBER_TOKEN.sub(replacer, value)
    return value, tokens


def restore_numeric_tokens(text: str, tokens: list[str]) -> str:
    value = text
    for index, token in enumerate(tokens):
        value = value.replace(make_token_placeholder(index), token)
    return value

QUESTION_CLEANUP_OVERRIDES: dict[str, dict] = {
    "ACC_2017_Q044": {
        "question": (
            "(주)감평은 (주)리스가 20×1년 1월 1일에 취득한 기계장치(공정가치 W390,000)에 대하여 "
            "금융리스계약(리스기간 3년, 연간리스료 W150,000 매년말 지급, (주)감평이 지급한 리스개설직접원가 W7,648)을 "
            "20×1년 1월 1일에 체결하고 즉시 사용하였다. 리스기간 종료시 예상잔존가치 W50,000 중 W20,000을 (주)감평이 보증하기로 하였다. "
            "동 금융리스에 적용되는 내재이자율이 연 12%라면, (주)감평이 20×1년도에 인식할 감가상각비는? "
            "(단, 리스자산은 정액법으로 감가상각한다.)"
        ),
        "table": "\n".join(
            [
                "| 기간 | 단일금액 W1의 현재가치 (12%) | 정상연금 W1의 현재가치 (12%) |",
                "| --- | --- | --- |",
                "| 1 | 0.8929 | 0.8929 |",
                "| 2 | 0.7972 | 1.6901 |",
                "| 3 | 0.7118 | 2.4018 |",
            ]
        ),
    },
    "ACC_2017_Q047": {
        "question": (
            "20×1년초 (주)감평은 정부보조금 W500,000을 받아 연구소건물(내용연수 5년, 잔존가치 W0, 정액법상각)을 "
            "W1,000,000에 취득하고 다음과 같이 회계처리를 하였다.\n\n"
            "(차변) 건물 1,000,000\n"
            "(대변) 현금 1,000,000\n\n"
            "위 거래와 관련하여 정부보조금 및 감가상각에 대한 회계처리가 누락되었다. "
            "이를 장부마감 이전에 반영하여 재무제표에 표시할 경우, 20×1년말 재무제표에 미치는 영향으로 옳은 것은? "
            "(단, 정부보조금은 자산에서 차감하는 방법으로 회계처리한다.)"
        ),
        "table": None,
    },
}


def load_questions() -> list[dict]:
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("questions") or []


def remove_ocr_footer(text: str | None) -> str:
    if text is None:
        return ""
    value = str(text)
    for pattern in FOOTER_PATTERNS:
        value = pattern.sub("", value)
    return value.strip()


def remove_choice_end_noise(text: str | None) -> str:
    if text is None:
        return ""
    value = remove_ocr_footer(str(text))
    value = re.sub(r"\s+A-\d{2}-\d{1,2}.*$", "", value, flags=re.I)
    value = re.sub(r"\s+교시\s*-\[\s*\d\s*\]\s*$", "", value, flags=re.I)
    return value.strip()


def fix_ocr_spacing(text: str | None, *, preserve_paragraphs: bool = False) -> str:
    if text is None:
        return ""
    value = str(text).replace("\ufffd", "").replace("\u0000", "")
    value = value.replace("\uFFE6", "W").replace("￦", "W")

    if preserve_paragraphs:
        value = EXCESS_NEWLINES.sub("\n\n", value)
        value = "\n".join(" ".join(line.split()) for line in value.split("\n"))
    else:
        value = re.sub(r"\s*\n+\s*", " ", value)
        value = re.sub(r"\s{2,}", " ", value)

    value, tokens = protect_numeric_tokens(value)

    value = re.sub(r"([.?;:])([가-힣A-Za-z0-9])", r"\1 \2", value)
    value = re.sub(r",([가-힣])", r", \1", value)
    value = re.sub(r"([가-힣0-9])(\()", r"\1 \2", value)
    value = re.sub(r"(\))([가-힣A-Za-z0-9])", r"\1 \2", value)
    value = re.sub(r"([가-힣])(W\d)", r"\1 \2", value)
    value = re.sub(r"([가-힣])(\d)", r"\1 \2", value)
    value = re.sub(r"(\d)([가-힣])", r"\1 \2", value)
    value = re.sub(r"(\d)(W)", r"\1 \2", value)
    value = re.sub(r"\(\s+", "(", value)
    value = re.sub(r"\s+\)", ")", value)
    value = re.sub(r"\s{2,}", " ", value)
    value = restore_numeric_tokens(value, tokens)
    return value.strip()


def clean_display_text(text: str | None, *, field: str = "text") -> str:
    if text is None:
        return ""
    value = remove_ocr_footer(str(text))
    value = CHOICE_SYMBOLS.sub("", value)
    if field.startswith("choices"):
        value = remove_choice_end_noise(value)
    value = fix_ocr_spacing(value, preserve_paragraphs=field == "originalQuestion")
    return value.strip()


def clean_question_for_display(question: dict) -> dict:
    override = QUESTION_CLEANUP_OVERRIDES.get(question["questionId"], {})
    cleaned = dict(question)

    if override.get("question"):
        cleaned["question"] = override["question"]
    else:
        cleaned["question"] = clean_display_text(question.get("question"), field="question")

    if "originalQuestion" in override:
        cleaned["originalQuestion"] = override["originalQuestion"]
    elif override.get("question"):
        table = override.get("table")
        cleaned["originalQuestion"] = (
            f"{override['question']}\n{table}" if table else override["question"]
        )
    else:
        cleaned["originalQuestion"] = clean_display_text(
            question.get("originalQuestion"),
            field="originalQuestion",
        )

    if "table" in override:
        cleaned["table"] = override["table"]
    elif question.get("table"):
        cleaned["table"] = clean_display_text(question.get("table"), field="table")

    cleaned["choices"] = [
        clean_display_text(choice, field=f"choices[{index}]")
        for index, choice in enumerate(question.get("choices") or [], start=1)
    ]
    cleaned["_displayCleaned"] = True
    return cleaned


def has_footer_noise(text: str | None) -> bool:
    if not text:
        return False
    sample = str(text)
    return any(pattern.search(sample) for pattern in FOOTER_PATTERNS)


def truncate(text: str, limit: int = 160) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[: limit - 1]}…"


def pick_samples(raw: list[dict], cleaned: list[dict]) -> list[dict]:
    """Pick 20 diverse before/after samples."""
    pairs = list(zip(raw, cleaned))
    selected: list[tuple[dict, dict, str]] = []
    seen: set[str] = set()

    def add(raw_q: dict, clean_q: dict, reason: str) -> None:
        qid = raw_q["questionId"]
        if qid in seen:
            return
        seen.add(qid)
        selected.append((raw_q, clean_q, reason))

    for override_id in QUESTION_CLEANUP_OVERRIDES:
        raw_q = next(q for q in raw if q["questionId"] == override_id)
        clean_q = next(q for q in cleaned if q["questionId"] == override_id)
        add(raw_q, clean_q, "table override")

    for raw_q, clean_q in pairs:
        if any(has_footer_noise(part) for part in [raw_q.get("question"), *(raw_q.get("choices") or [])]):
            add(raw_q, clean_q, "footer removed")
        if len(selected) >= SAMPLE_SIZE:
            break

    for raw_q, clean_q in pairs:
        before = str(raw_q.get("question", ""))
        after = str(clean_q.get("question", ""))
        if before != after and raw_q["questionId"] not in seen:
            add(raw_q, clean_q, "spacing improved")
        if len(selected) >= SAMPLE_SIZE:
            break

    for raw_q, clean_q in pairs:
        add(raw_q, clean_q, "general")
        if len(selected) >= SAMPLE_SIZE:
            break

    return [
        {
            "questionId": raw_q["questionId"],
            "reason": reason,
            "beforeQuestion": truncate(str(raw_q.get("question", ""))),
            "afterQuestion": truncate(str(clean_q.get("question", ""))),
            "beforeChoice5": truncate(str((raw_q.get("choices") or ["-"] * 5)[4])),
            "afterChoice5": truncate(str((clean_q.get("choices") or ["-"] * 5)[4])),
        }
        for raw_q, clean_q, reason in selected[:SAMPLE_SIZE]
    ]


def build_report(
    *,
    passed: list[str],
    failures: list[str],
    footer_before: int,
    footer_after: int,
    samples: list[dict],
) -> str:
    status = "PASS" if not failures else "FAIL"
    lines = [
        "# MVP Cleanup Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 대상: `data/question-db-mvp.json` (원본 JSON 미변경)",
        "- 레이어: `js/data-cleaner.js` + `js/question-cleanup-overrides.js`",
        "",
        "## Validation Summary",
        "",
        f"| 항목 | 결과 |",
        f"|------|------|",
        f"| 상태 | **{status}** |",
        f"| 문항 수 | {EXPECTED_TOTAL} |",
        f"| footer 잡음 (정제 전) | {footer_before}건 |",
        f"| footer 잡음 (정제 후) | {footer_after}건 |",
        "",
        "### 검증 항목",
        "",
    ]
    for item in passed:
        lines.append(f"- PASS: {item}")
    for item in failures:
        lines.append(f"- FAIL: {item}")

    lines.extend(
        [
            "",
            "## Before / After 샘플 (20건)",
            "",
            "| ID | 사유 | Before (question) | After (question) |",
            "|----|------|-------------------|------------------|",
        ]
    )
    for sample in samples:
        lines.append(
            f"| `{sample['questionId']}` | {sample['reason']} | "
            f"{sample['beforeQuestion']} | {sample['afterQuestion']} |"
        )

    lines.extend(["", "### 보기 ⑤ Before / After", ""])
    for sample in samples[:10]:
        if sample["beforeChoice5"] != sample["afterChoice5"]:
            lines.append(f"- `{sample['questionId']}`")
            lines.append(f"  - Before: {sample['beforeChoice5']}")
            lines.append(f"  - After: {sample['afterChoice5']}")

    lines.append("")
    return "\n".join(lines)


def validate() -> int:
    failures: list[str] = []
    passed: list[str] = []

    required_js = [
        JS / "data-cleaner.js",
        JS / "question-cleanup-overrides.js",
    ]
    for path in required_js:
        if not path.exists():
            failures.append(f"Missing {path.relative_to(ROOT).as_posix()}")
        else:
            passed.append(f"{path.name} exists")

    loader = (JS / "data-loader.js").read_text(encoding="utf-8")
    if "applyQuestionCleanup" not in loader:
        failures.append("data-loader.js does not apply cleanup layer")
    else:
        passed.append("data-loader.js integrates cleanup layer")

    raw_mtime = QUESTION_DB.stat().st_mtime
    raw = load_questions()
    cleaned = [clean_question_for_display(q) for q in raw]

    if len(raw) != EXPECTED_TOTAL or len(cleaned) != EXPECTED_TOTAL:
        failures.append(f"Question count {len(raw)}/{EXPECTED_TOTAL}")
    else:
        passed.append(f"{EXPECTED_TOTAL} questions preserved")

    answer_changes = []
    pattern_changes = []
    choice_count_changes = []

    for raw_q, clean_q in zip(raw, cleaned):
        qid = raw_q["questionId"]
        if raw_q.get("answer") != clean_q.get("answer"):
            answer_changes.append(qid)
        if raw_q.get("patternId") != clean_q.get("patternId"):
            pattern_changes.append(qid)
        if len(raw_q.get("choices") or []) != len(clean_q.get("choices") or []):
            choice_count_changes.append(qid)

    if answer_changes:
        failures.append(f"answer changed: {', '.join(answer_changes[:5])}")
    else:
        passed.append("answer unchanged (240/240)")

    if pattern_changes:
        failures.append(f"patternId changed: {', '.join(pattern_changes[:5])}")
    else:
        passed.append("patternId unchanged (240/240)")

    if choice_count_changes:
        failures.append(f"choice count changed: {', '.join(choice_count_changes[:5])}")
    else:
        passed.append("choice count unchanged (240/240)")

    footer_before = 0
    footer_after = 0
    for raw_q, clean_q in zip(raw, cleaned):
        parts_before = [raw_q.get("question"), raw_q.get("originalQuestion"), *(raw_q.get("choices") or [])]
        parts_after = [clean_q.get("question"), clean_q.get("originalQuestion"), *(clean_q.get("choices") or [])]
        if any(has_footer_noise(p) for p in parts_before):
            footer_before += 1
        if any(has_footer_noise(p) for p in parts_after):
            footer_after += 1

    if footer_after > 0:
        failures.append(f"footer noise remains in {footer_after} questions after cleanup")
    else:
        passed.append("footer noise removed from all affected display fields")

    for qid in QUESTION_CLEANUP_OVERRIDES:
        clean_q = next(q for q in cleaned if q["questionId"] == qid)
        if qid == "ACC_2017_Q044":
            if not clean_q.get("table") or "| 0.8929 |" not in clean_q["table"]:
                failures.append(f"{qid} table override invalid")
            elif len(clean_q.get("question", "")) < 80:
                failures.append(f"{qid} question override too short")
            else:
                passed.append(f"{qid} table override applied")
        if qid == "ACC_2017_Q047":
            if clean_q.get("table") is not None:
                failures.append(f"{qid} table should be null after override")
            elif "정부보조금" not in clean_q.get("question", ""):
                failures.append(f"{qid} question override missing key text")
            else:
                passed.append(f"{qid} journal-entry override applied")

    samples = pick_samples(raw, cleaned)
    report = build_report(
        passed=passed,
        failures=failures,
        footer_before=footer_before,
        footer_after=footer_after,
        samples=samples,
    )
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report, encoding="utf-8")

    print("MVP Cleanup Validation")
    for item in passed:
        print(f"  PASS: {item}")
    for item in failures:
        print(f"  FAIL: {item}")
    print(f"- footer before/after: {footer_before}/{footer_after}")
    print(f"- report: {REPORT_PATH}")
    print(f"- raw db mtime preserved: {QUESTION_DB.exists()}")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(validate())
