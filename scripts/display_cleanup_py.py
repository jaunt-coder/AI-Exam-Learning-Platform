"""Python mirror of js/data-cleaner.js for offline validation and reports."""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS_DIR = ROOT / "js"
QUESTION_DB = ROOT / "data" / "question-db-mvp.json"

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
GLUED_HANGUL = re.compile(r"[가-힣]{12,}")
FORMATTED_NUMBER = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?")

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


def load_accounting_terms() -> tuple[list[str], list[str]]:
    text = (JS_DIR / "accounting-term-dictionary.js").read_text(encoding="utf-8")
    terms = re.findall(r"'([^']+)'", re.search(r"ACCOUNTING_TERMS = \[(.*?)\];", text, re.S).group(1))
    prefixes = re.findall(r"'([^']+)'", re.search(r"ACCOUNTING_PREFIXES = \[(.*?)\];", text, re.S).group(1))
    return sorted(set(terms), key=len, reverse=True), prefixes


ACCOUNTING_TERMS_SORTED, ACCOUNTING_PREFIXES = load_accounting_terms()


def make_token_placeholder(index: int) -> str:
    return f"@@N{chr(0xE000 + index)}@@"


def protect_numeric_tokens(text: str) -> tuple[str, list[str]]:
    tokens: list[str] = []

    def repl(match: re.Match[str]) -> str:
        tokens.append(match.group(0).replace(" ", ""))
        return make_token_placeholder(len(tokens) - 1)

    value = re.sub(r"W\d{1,3}(?:,\d{3})+(?:\.\d+)?", repl, text, flags=re.I)
    value = re.sub(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?", repl, value)
    value = re.sub(r"20[×xX]\d{1,2}", repl, value)
    return value, tokens


def restore_numeric_tokens(text: str, tokens: list[str]) -> str:
    value = text
    for index, token in enumerate(tokens):
        value = value.replace(make_token_placeholder(index), token)
    return value


def add_commas(integer_part: str) -> str:
    parts = []
    while integer_part:
        parts.insert(0, integer_part[-3:])
        integer_part = integer_part[:-3]
    return ",".join(parts)


def format_number_token(raw: str) -> str:
    normalized = raw.replace(" ", "")
    if not normalized or "," in normalized:
        return normalized
    if re.fullmatch(r"20[×xX]\d{1,2}", normalized):
        return re.sub(r"[xX]", "×", normalized)
    match = re.fullmatch(r"(\d+)(?:\.(\d+))?", normalized)
    if not match:
        return normalized
    integer_part, decimal_part = match.groups()
    if len(integer_part) < 4 and decimal_part is None:
        return normalized
    formatted = add_commas(integer_part)
    return f"{formatted}.{decimal_part}" if decimal_part else formatted


def format_display_numbers(text: str | None) -> str:
    if text is None:
        return ""
    value = str(text)
    protected_years: list[str] = []

    def protect_year(match: re.Match[str]) -> str:
        protected_years.append(re.sub(r"[xX]", "×", match.group(0)))
        return make_token_placeholder(len(protected_years) - 1)

    value = re.sub(r"20[×xX]\d{1,2}", protect_year, value)
    value = re.sub(
        r"W(\d[\d,]*(?:\.\d+)?)",
        lambda m: f"W{format_number_token(m.group(1).replace(',', ''))}",
        value,
        flags=re.I,
    )
    value = re.sub(
        r"(\d[\d,]*(?:\.\d+)?)(?=원|천원|백만원|억원)",
        lambda m: format_number_token(m.group(1).replace(",", "")),
        value,
    )
    value = re.sub(r"\b(\d{4,})(?!\d|,|\.)", lambda m: format_number_token(m.group(1)), value)
    for index, token in enumerate(protected_years):
        value = value.replace(make_token_placeholder(index), token)
    return value


def apply_accounting_term_spacing(text: str | None) -> str:
    if text is None:
        return ""
    value, tokens = protect_numeric_tokens(str(text))
    for term in ACCOUNTING_TERMS_SORTED:
        if len(term) < 2:
            continue
        value = re.sub(rf"(?<![\s])(?<=[가-힣])({re.escape(term)})", r" \1", value)
    for prefix in ACCOUNTING_PREFIXES:
        if len(prefix) < 2:
            continue
        value = re.sub(rf"(?<=[가-힣])({re.escape(prefix)})(?=[가-힣])", r" \1 ", value)
    value = re.sub(r"\s{2,}", " ", value)
    return restore_numeric_tokens(value, tokens)


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
    value = re.sub(
        r"(\d)([가-힣])",
        lambda m: (
            m.group(0)
            if re.match(r"^원($|[^가-힣])", m.string[m.start(2) :])
            or re.match(r"^(천원|백만원|억원)", m.string[m.start(2) :])
            or m.group(2) in {"㎡", "%"}
            else f"{m.group(1)} {m.group(2)}"
        ),
        value,
    )
    value = re.sub(r"(\d)(W)", r"\1 \2", value)
    value = re.sub(r"\(\s+", "(", value)
    value = re.sub(r"\s+\)", ")", value)
    value = re.sub(r"\s{2,}", " ", value)
    return restore_numeric_tokens(value, tokens).strip()


def clean_display_text(text: str | None, *, field: str = "text") -> str:
    if text is None:
        return ""
    value = remove_ocr_footer(str(text))
    value = CHOICE_SYMBOLS.sub("", value)
    if field.startswith("choices"):
        value = remove_choice_end_noise(value)
    preserve_paragraphs = field in {"originalQuestion", "table"}
    value = fix_ocr_spacing(value, preserve_paragraphs=preserve_paragraphs)
    value = format_display_numbers(value)
    value = apply_accounting_term_spacing(value)
    return value.strip()


def measure_readability(text: str | None) -> dict[str, float | int]:
    if not text:
        return {"longestGlued": 0, "spaceRatio": 0.0, "unformattedNumbers": 0}
    sample = str(text)
    hangul_only = re.sub(r"[^\uAC00-\uD7A3\s]", "", sample)
    hangul_tokens = [
        re.sub(r"[^\uAC00-\uD7A3]", "", token)
        for token in sample.split()
        if re.sub(r"[^\uAC00-\uD7A3]", "", token)
    ]
    longest_glued = max((len(token) for token in hangul_tokens), default=0)
    hangul_chars = len(hangul_only.replace(" ", ""))
    spaces = len(re.findall(r"\s", hangul_only))
    space_ratio = spaces / hangul_chars if hangul_chars else 0.0
    without_formatted = FORMATTED_NUMBER.sub("", sample)
    unformatted = 0
    for token in re.findall(r"\d{4,}", without_formatted):
        if re.match(r"20[×xX]\d", token):
            continue
        unformatted += 1
    return {
        "longestGlued": longest_glued,
        "spaceRatio": space_ratio,
        "unformattedNumbers": unformatted,
    }


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
        cleaned["originalQuestion"] = f"{override['question']}\n{table}" if table else override["question"]
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


def apply_question_cleanup(questions: list[dict]) -> list[dict]:
    return [clean_question_for_display(q) for q in questions]


def load_questions() -> list[dict]:
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    return payload if isinstance(payload, list) else payload.get("questions") or []


def aggregate_metrics(questions: list[dict]) -> dict:
    longest_glued = 0
    glued_questions = 0
    total_space_ratio = 0.0
    unformatted_numbers = 0
    fields = 0
    for question in questions:
        parts = [
            question.get("question"),
            question.get("originalQuestion"),
            *(question.get("choices") or []),
            question.get("table"),
        ]
        question_glued = 0
        for part in parts:
            if not part:
                continue
            metrics = measure_readability(part)
            longest_glued = max(longest_glued, metrics["longestGlued"])
            question_glued = max(question_glued, metrics["longestGlued"])
            total_space_ratio += metrics["spaceRatio"]
            unformatted_numbers += metrics["unformattedNumbers"]
            fields += 1
        if question_glued >= 12:
            glued_questions += 1
    return {
        "longestGlued": longest_glued,
        "gluedQuestions": glued_questions,
        "avgSpaceRatio": total_space_ratio / fields if fields else 0.0,
        "unformattedNumbers": unformatted_numbers,
        "fields": fields,
    }


def build_metrics_report() -> dict:
    raw = load_questions()
    cleaned = apply_question_cleanup(raw)
    before = aggregate_metrics(raw)
    after = aggregate_metrics(cleaned)

    def pct_delta(before_val: float, after_val: float) -> float:
        if before_val == 0:
            return 0.0
        return (before_val - after_val) / before_val * 100

    return {
        "generatedAt": date.today().isoformat(),
        "questionCount": len(raw),
        "dbPath": "data/question-db-mvp.json",
        "dbModified": False,
        "before": before,
        "after": after,
        "improvement": {
            "gluedQuestionsReduction": pct_delta(before["gluedQuestions"], after["gluedQuestions"]),
            "longestGluedReduction": pct_delta(before["longestGlued"], after["longestGlued"]),
            "spaceRatioIncrease": (
                (after["avgSpaceRatio"] - before["avgSpaceRatio"]) / before["avgSpaceRatio"] * 100
                if before["avgSpaceRatio"]
                else after["avgSpaceRatio"] * 100
            ),
            "unformattedNumbersReduction": pct_delta(
                before["unformattedNumbers"],
                after["unformattedNumbers"],
            ),
        },
        "demos": {
            "termSpacing": {
                "before": "기말재고자산",
                "after": clean_display_text("기말재고자산", field="question"),
            },
            "numberFormatting": {
                "before": "10000원, W1000000",
                "after": clean_display_text("10000원, W1000000", field="question"),
            },
        },
        "samples": _pick_samples(raw, cleaned),
    }


def _truncate(text: str, limit: int = 140) -> str:
    compact = " ".join(str(text or "").split())
    return compact if len(compact) <= limit else f"{compact[: limit - 1]}…"


def _pick_samples(raw: list[dict], cleaned: list[dict]) -> list[dict]:
    samples: list[dict] = []
    seen: set[str] = set()

    def add(raw_q: dict, clean_q: dict, reason: str) -> None:
        qid = raw_q["questionId"]
        if qid in seen or len(samples) >= 20:
            return
        seen.add(qid)
        samples.append(
            {
                "questionId": qid,
                "reason": reason,
                "beforeQuestion": _truncate(raw_q.get("question", "")),
                "afterQuestion": _truncate(clean_q.get("question", "")),
                "beforeMetrics": measure_readability(raw_q.get("question", "")),
                "afterMetrics": measure_readability(clean_q.get("question", "")),
            }
        )

    for raw_q, clean_q in zip(raw, cleaned):
        before = measure_readability(raw_q.get("question", ""))
        after = measure_readability(clean_q.get("question", ""))
        if before["longestGlued"] >= 12 and after["longestGlued"] < before["longestGlued"]:
            add(raw_q, clean_q, "glued hangul improved")
    for raw_q, clean_q in zip(raw, cleaned):
        before = measure_readability(raw_q.get("question", ""))
        after = measure_readability(clean_q.get("question", ""))
        if before["unformattedNumbers"] > after["unformattedNumbers"]:
            add(raw_q, clean_q, "number formatting")
    for raw_q, clean_q in zip(raw, cleaned):
        if raw_q.get("question") != clean_q.get("question"):
            add(raw_q, clean_q, "term spacing")
    return samples[:20]
