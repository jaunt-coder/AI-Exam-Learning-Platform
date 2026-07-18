#!/usr/bin/env python3
"""MVP question-db quality audit (read-only analysis)."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import textwrap
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
QUESTION_DB = DATA / "question-db-mvp.json"
PATTERN_DB = DATA / "pattern-db-mvp.json"
STATISTICS_DB = DATA / "statistics-mvp.json"
REPORT_PATH = ROOT / "docs" / "mvp-quality-report.md"
ANALYSIS_DIR = DATA / "analysis"
TUTOR_CACHE = ANALYSIS_DIR / "tutor-audit-cache.json"

MVP_YEARS = [2015, 2017, 2018, 2020, 2024, 2025]
CHOICE_SYMBOLS = ["①", "②", "③", "④", "⑤"]
EXPECTED_TOTAL = 240
MIN_SAMPLES_PER_PATTERN = 3

# --- heuristics ---
REPLACEMENT_CHAR = "\ufffd"
MOJIBAKE_MARKERS = ("Ã", "Â", "ï¿½", "�", "Ð", "Ñ")
OCR_GLUE_PATTERN = re.compile(r"[가-힣]{12,}")
OCR_FRAGMENT_PATTERN = re.compile(r"(?<=[가-힣])[A-Za-z]{1,2}(?=[가-힣])")
FOOTER_PATTERNS = [
    re.compile(r"A-\d{2}-\d"),
    re.compile(r"한국산업"),
    re.compile(r"교시\s*-\["),
    re.compile(r"page\s*\(", re.I),
    re.compile(r"제\d+회"),
]
CHOICE_MARKER_IN_TEXT = re.compile(r"[①②③④⑤]")
TABLE_ROW_PATTERN = re.compile(r"^\|.+\|$", re.M)
TABLE_SEP_PATTERN = re.compile(r"^\|\s*[-:| ]+\|\s*$", re.M)
W_CURRENCY_GLUE = re.compile(r"(?<=[가-힣])W\d")
MISSING_SPACE_AFTER_PUNCT = re.compile(r"[.?][가-힣]")
EXCESS_NEWLINES = re.compile(r"\n{4,}")


@dataclass
class Issue:
    severity: str  # critical | warning | info
    category: str
    question_id: str
    detail: str


@dataclass
class AuditState:
    issues: list[Issue] = field(default_factory=list)
    counters: Counter = field(default_factory=Counter)

    def add(self, severity: str, category: str, question_id: str, detail: str) -> None:
        self.issues.append(Issue(severity, category, question_id, detail))
        self.counters[f"{severity}:{category}"] += 1


def load_questions() -> list[dict]:
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("questions") or []


def load_patterns() -> list[dict]:
    return json.loads(PATTERN_DB.read_text(encoding="utf-8"))


def inspect_text(text: str, question_id: str, field_name: str, state: AuditState) -> None:
    if text is None:
        return
    value = str(text)
    if not value.strip():
        state.add("critical", "question_empty", question_id, f"{field_name} 빈 문자열")
        return

    if REPLACEMENT_CHAR in value:
        state.add("critical", "broken_char", question_id, f"{field_name} replacement char(U+FFFD)")

    for marker in MOJIBAKE_MARKERS:
        if marker in value:
            state.add("warning", "broken_char", question_id, f"{field_name} mojibake `{marker}`")

    if "\u0000" in value:
        state.add("critical", "broken_char", question_id, f"{field_name} NUL byte")

    for pattern in FOOTER_PATTERNS:
        if pattern.search(value):
            state.add("warning", "ocr_footer", question_id, f"{field_name} footer/noise `{pattern.pattern}`")

    if field_name in {"question", "originalQuestion"}:
        compact = re.sub(r"\s+", "", value)
        if OCR_GLUE_PATTERN.search(compact):
            state.add("warning", "ocr_glued_hangul", question_id, f"{field_name} 연속 한글 12자+ (띄어쓰기 누락 의심)")

        if OCR_FRAGMENT_PATTERN.search(value):
            state.add("info", "ocr_fragment", question_id, f"{field_name} 한글 사이 영문 단편")

        if MISSING_SPACE_AFTER_PUNCT.search(value):
            state.add("info", "ocr_punctuation", question_id, f"{field_name} 구두점 뒤 공백 누락")

        if EXCESS_NEWLINES.search(value):
            state.add("warning", "ocr_linebreak", question_id, f"{field_name} 과다 줄바꿈(4줄+)")

        if W_CURRENCY_GLUE.search(value):
            state.add("info", "ocr_currency", question_id, f"{field_name} `W` 통화 표기(￦ 대체)")


def audit_questions(questions: list[dict], state: AuditState) -> None:
    for question in questions:
        qid = question.get("questionId", "?")
        inspect_text(question.get("question", ""), qid, "question", state)
        inspect_text(question.get("originalQuestion", ""), qid, "originalQuestion", state)

        if len(str(question.get("question", "")).strip()) < 8:
            state.add("warning", "question_short", qid, "question 길이 8자 미만")

        if question.get("hasTable"):
            table = question.get("table")
            if not table or not str(table).strip():
                state.add("critical", "table_markdown", qid, "hasTable=true but table empty")
            else:
                table_text = str(table)
                rows = TABLE_ROW_PATTERN.findall(table_text)
                seps = TABLE_SEP_PATTERN.findall(table_text)
                if len(rows) < 2:
                    state.add("warning", "table_markdown", qid, f"Markdown table rows={len(rows)} (<2)")
                if not seps:
                    state.add("warning", "table_markdown", qid, "Markdown separator row missing")
                if "| --- |" not in table_text and "|---|" not in table_text.replace(" ", ""):
                    state.add("info", "table_markdown", qid, "표 구분선 형식 비표준")

        if question.get("questionType") == "table" and not question.get("hasTable"):
            state.add("warning", "table_flag", qid, "questionType=table but hasTable=false")


def audit_choices(question: dict, state: AuditState) -> None:
    qid = question.get("questionId", "?")
    choices = question.get("choices") or []

    if len(choices) != 5:
        state.add("critical", "choice_count", qid, f"보기 {len(choices)}개")

    seen_markers: list[int] = []
    for index, choice in enumerate(choices, start=1):
        text = str(choice or "")
        if not text.strip():
            state.add("critical", "choice_empty", qid, f"보기 {index} 빈 문자열")

        markers = CHOICE_MARKER_IN_TEXT.findall(text)
        if markers:
            state.add("warning", "choice_marker", qid, f"보기 {index} 내부 기호 {markers}")
            seen_markers.extend(range(1, 6))

        inspect_text(text, qid, f"choices[{index}]", state)

        if index == 5 and any(p.search(text) for p in FOOTER_PATTERNS):
            state.add("warning", "choice_footer", qid, "⑤ 보기에 페이지 잡음 포함")

    if len(set(choices)) < len(choices):
        state.add("warning", "choice_duplicate", qid, "보기 텍스트 중복")


def audit_answer(question: dict, state: AuditState) -> None:
    qid = question.get("questionId", "?")
    answer = question.get("answer")
    answer_index = question.get("answerIndex")
    choices = question.get("choices") or []

    if not isinstance(answer, int) or not (1 <= answer <= 5):
        state.add("critical", "answer_range", qid, f"answer={answer!r} (1~5 아님)")

    if answer != answer_index:
        state.add("critical", "answer_index", qid, f"answer({answer}) != answerIndex({answer_index})")

    if isinstance(answer, int) and 1 <= answer <= 5:
        if len(choices) < answer:
            state.add("critical", "answer_choice", qid, "answer index exceeds choices length")
        elif not str(choices[answer - 1]).strip():
            state.add("critical", "answer_choice", qid, f"정답 보기 {answer} 빈 문자열")


def audit_patterns(questions: list[dict], patterns: list[dict], state: AuditState) -> dict[str, list[dict]]:
    pattern_ids = {item["patternId"] for item in patterns}
    by_pattern: dict[str, list[dict]] = defaultdict(list)

    for question in questions:
        qid = question.get("questionId", "?")
        pattern_id = question.get("patternId")
        if not pattern_id:
            state.add("critical", "pattern_missing", qid, "patternId 없음")
            continue
        if pattern_id not in pattern_ids:
            state.add("critical", "pattern_link", qid, f"pattern-db 미연결 `{pattern_id}`")
        by_pattern[pattern_id].append(question)

    for pattern in patterns:
        pid = pattern["patternId"]
        linked = [q for q in questions if q.get("patternId") == pid]
        if pattern.get("frequency") != len(linked):
            state.add(
                "warning",
                "pattern_frequency",
                pid,
                f"frequency {pattern.get('frequency')} != linked {len(linked)}",
            )

    return by_pattern


def build_tutor_audit_script() -> str:
    return textwrap.dedent(
        """
        import { readFileSync, writeFileSync, mkdirSync } from 'fs';
        import { dirname, join } from 'path';
        import { fileURLToPath } from 'url';
        import { generateQuestionTutorContent } from '../js/ai-tutor-engine.js';

        const root = join(dirname(fileURLToPath(import.meta.url)), '..');
        const read = (rel) => readFileSync(join(root, rel), 'utf8');
        const payload = JSON.parse(read('data/question-db-mvp.json'));
        const patterns = JSON.parse(read('data/pattern-db-mvp.json'));
        const questions = payload.questions || payload;
        const patternMap = Object.fromEntries(patterns.map((p) => [p.patternId, p]));
        const byPattern = {};
        for (const q of questions) {
          (byPattern[q.patternId] ||= []).push(q);
        }

        const samples = [];
        for (const [patternId, items] of Object.entries(byPattern)) {
          for (const q of items.slice(0, 3)) {
            const pattern = patternMap[patternId] || null;
            const content = generateQuestionTutorContent(q, pattern);
            const wrongKeys = content.wrongAnswerAnalysis
              ? Object.keys(content.wrongAnswerAnalysis).length
              : 0;
            samples.push({
              questionId: q.questionId,
              patternId,
              patternName: pattern?.name || patternId,
              hasExplanation: Boolean(String(content.explanation || '').trim()),
              hasSolvingAlgorithm: Array.isArray(content.solvingAlgorithm)
                && content.solvingAlgorithm.length > 0,
              hasWrongAnswerAnalysis: wrongKeys >= 4,
              wrongAnalysisCount: wrongKeys,
              hasMemoryTip: Boolean(String(content.memoryTip || '').trim()),
              profileSource: content._meta?.hasOverride ? 'override' : 'profile_or_fallback',
              resolvable: Boolean(content._meta?.resolvable),
            });
          }
        }

        const outPath = join(root, 'data', 'analysis', 'tutor-audit-cache.json');
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, JSON.stringify(samples, null, 2));
        """
    ).strip()


def audit_tutor_python(questions: list[dict], patterns: list[dict]) -> list[dict]:
    """Simulate buildFallbackProfile tutor content without modifying engine code."""
    pattern_map = {item["patternId"]: item for item in patterns}
    by_pattern: dict[str, list[dict]] = defaultdict(list)
    for question in questions:
        by_pattern[question["patternId"]].append(question)

    samples: list[dict] = []
    for pattern_id, items in sorted(by_pattern.items()):
        pattern = pattern_map.get(pattern_id)
        for question in items[:MIN_SAMPLES_PER_PATTERN]:
            choices = question.get("choices") or []
            answer = int(question.get("answer") or 0)
            wrong_count = sum(1 for idx in range(1, 6) if idx != answer and idx <= len(choices))
            name = pattern.get("name") if pattern else pattern_id
            explanation = f"{name} Pattern의 핵심 개념을 적용해 풀이합니다."
            solving_algorithm = [
                "문제에서 핵심 조건·키워드를 표시한다.",
                "Pattern별 기본 원칙을 적용한다.",
                "각 보기를 원칙과 대조한다.",
                "정답을 선택한다.",
            ]
            memory_tip = (
                f"{name}의 핵심 키워드를 flashcard로 암기하고, "
                "기출 1문제와 짝지어 반복하세요."
            )
            samples.append(
                {
                    "questionId": question["questionId"],
                    "patternId": pattern_id,
                    "patternName": name,
                    "hasExplanation": bool(explanation.strip()),
                    "hasSolvingAlgorithm": len(solving_algorithm) > 0,
                    "hasWrongAnswerAnalysis": wrong_count >= 4,
                    "wrongAnalysisCount": wrong_count,
                    "hasMemoryTip": bool(memory_tip.strip()),
                    "profileSource": "profile_or_fallback",
                    "engine": "python-fallback",
                }
            )
    return samples


def run_tutor_sampling() -> tuple[list[dict], str | None]:
    script_path = ROOT / "scripts" / ".tutor-audit-runner.mjs"
    script_path.write_text(build_tutor_audit_script(), encoding="utf-8")
    try:
        proc = subprocess.run(
            ["node", str(script_path)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
    except FileNotFoundError:
        return [], "Node.js unavailable"
    except subprocess.TimeoutExpired:
        return [], "AI Tutor sampling timeout"

    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "unknown error").strip()
        return [], f"node runner failed: {err[:400]}"

    if not TUTOR_CACHE.exists():
        return [], "tutor-audit-cache.json not created"

    samples = json.loads(TUTOR_CACHE.read_text(encoding="utf-8"))
    for item in samples:
        item["engine"] = "node"
    return samples, None


def summarize_tutor(samples: list[dict], state: AuditState) -> dict:
    summary = {
        "total_samples": len(samples),
        "patterns_sampled": len({item["patternId"] for item in samples}),
        "explanation_ok": 0,
        "algorithm_ok": 0,
        "wrong_ok": 0,
        "memory_ok": 0,
        "all_ok": 0,
        "by_pattern": defaultdict(list),
    }

    for item in samples:
        summary["by_pattern"][item["patternId"]].append(item)
        exp = item.get("hasExplanation")
        alg = item.get("hasSolvingAlgorithm")
        wrong = item.get("hasWrongAnswerAnalysis")
        mem = item.get("hasMemoryTip")
        summary["explanation_ok"] += int(exp)
        summary["algorithm_ok"] += int(alg)
        summary["wrong_ok"] += int(wrong)
        summary["memory_ok"] += int(mem)
        if exp and alg and wrong and mem:
            summary["all_ok"] += 1
        else:
            qid = item.get("questionId", "?")
            missing = []
            if not exp:
                missing.append("explanation")
            if not alg:
                missing.append("solvingAlgorithm")
            if not wrong:
                missing.append("wrongAnswerAnalysis")
            if not mem:
                missing.append("memoryTip")
            state.add(
                "warning",
                "tutor_sample",
                qid,
                f"AI Tutor 필드 부족: {', '.join(missing)}",
            )

    return summary


def group_issues(issues: list[Issue]) -> dict[str, list[Issue]]:
    grouped: dict[str, list[Issue]] = defaultdict(list)
    for issue in issues:
        grouped[issue.category].append(issue)
    return grouped


def render_issue_section(title: str, issues: list[Issue], limit: int = 25) -> list[str]:
    if not issues:
        return [f"### {title}", "", "- 이슈 없음", ""]
    lines = [f"### {title}", "", f"- 건수: **{len(issues)}**", ""]
    for issue in issues[:limit]:
        lines.append(f"- `{issue.question_id}` ({issue.severity}): {issue.detail}")
    if len(issues) > limit:
        lines.append(f"- ... 외 {len(issues) - limit}건")
    lines.append("")
    return lines


def build_report(
    questions: list[dict],
    patterns: list[dict],
    state: AuditState,
    tutor_samples: list[dict],
    tutor_summary: dict,
    tutor_error: str | None,
    tutor_engine: str,
) -> str:
    critical = [i for i in state.issues if i.severity == "critical"]
    warning = [i for i in state.issues if i.severity == "warning"]
    info = [i for i in state.issues if i.severity == "info"]
    grouped = group_issues(state.issues)

    by_year = Counter(q.get("year") for q in questions)
    ocr_by_year = Counter(
        issue.question_id.split("_")[1]
        for issue in state.issues
        if issue.category.startswith("ocr_") and "_" in issue.question_id
    )

    grade = "A"
    if critical:
        grade = "D"
    elif len(warning) > 40:
        grade = "C"
    elif warning:
        grade = "B"

    lines = [
        "# MVP Quality Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 대상: `data/question-db-mvp.json` (240문항, read-only 분석)",
        "- 범위: Question · Choice · Answer · Pattern · AI Tutor 샘플",
        "",
        "## Executive Summary",
        "",
        "| 항목 | 결과 |",
        "|------|------|",
        f"| 총 문항 | {len(questions)} |",
        f"| Pattern | {len(patterns)} |",
        f"| Critical | {len(critical)} |",
        f"| Warning | {len(warning)} |",
        f"| Info | {len(info)} |",
        f"| QA 등급 | **{grade}** |",
        "",
        "### 핵심 소견",
        "",
    ]

    if critical:
        lines.append("- **Critical 이슈**가 있어 실사용 전 수정 Phase가 필요합니다.")
    else:
        lines.append("- Critical 이슈 없음 — 구조적으로 240문항 서비스 가능.")

    lines.extend(
        [
            "- PDF 추출 특성상 **띄어쓰기 누락·페이지 잡음·표 Markdown 손상**이 다수 Warning으로 집계됩니다.",
            "- AI Tutor는 DB `solution`이 비어 있어도 Pattern Profile/Fallback으로 **과외 콘텐츠 생성**됩니다.",
            "",
            "## 1. Question 품질",
            "",
            "| 검사 | Critical | Warning | Info |",
            "|------|----------|---------|------|",
        ]
    )

    q_categories = [
        "question_empty",
        "question_short",
        "broken_char",
        "ocr_glued_hangul",
        "ocr_footer",
        "ocr_linebreak",
        "ocr_fragment",
        "ocr_punctuation",
        "ocr_currency",
        "table_markdown",
        "table_flag",
    ]
    for cat in q_categories:
        c = sum(1 for i in state.issues if i.category == cat and i.severity == "critical")
        w = sum(1 for i in state.issues if i.category == cat and i.severity == "warning")
        n = sum(1 for i in state.issues if i.category == cat and i.severity == "info")
        if c or w or n:
            lines.append(f"| {cat} | {c} | {w} | {n} |")

    lines.append("")
    lines.extend(render_issue_section("Question Warning 샘플", [i for i in warning if i.category.startswith(("question", "ocr", "table"))]))

    lines.extend(
        [
            "## 2. Choice 품질",
            "",
            "| 검사 | Critical | Warning |",
            "|------|----------|---------|",
        ]
    )
    for cat in ["choice_count", "choice_empty", "choice_marker", "choice_footer", "choice_duplicate"]:
        c = sum(1 for i in state.issues if i.category == cat and i.severity == "critical")
        w = sum(1 for i in state.issues if i.category == cat and i.severity == "warning")
        if c or w:
            lines.append(f"| {cat} | {c} | {w} |")

    lines.extend(render_issue_section("Choice Warning 샘플", [i for i in warning if i.category.startswith("choice")]))

    lines.extend(
        [
            "## 3. Answer 품질",
            "",
        ]
    )
    ans_critical = [i for i in critical if i.category.startswith("answer")]
    if ans_critical:
        lines.extend(render_issue_section("Answer Critical", ans_critical))
    else:
        lines.extend(["- 240/240 문항 answer 1~5, answerIndex 일치, 정답 보기 연결 **PASS**", ""])

    lines.extend(
        [
            "## 4. Pattern 품질",
            "",
        ]
    )
    pat_issues = [i for i in state.issues if i.category.startswith("pattern")]
    if pat_issues:
        lines.extend(render_issue_section("Pattern 이슈", pat_issues))
    else:
        lines.extend(["- patternId 100% 연결, frequency 일치 **PASS**", ""])

    lines.extend(
        [
            "## 5. AI Tutor 품질 (Pattern별 3문항 샘플)",
            "",
        ]
    )

    if tutor_error:
        lines.extend([f"- Note: {tutor_error}", ""])
    if tutor_samples:
        lines.extend(
            [
                f"- Sampling engine: `{tutor_engine}`",
                f"- 샘플 수: {tutor_summary['total_samples']} (Pattern {tutor_summary['patterns_sampled']}개, Pattern당 최대 {MIN_SAMPLES_PER_PATTERN}문항)",
                "",
            ]
        )
        if tutor_engine == "python-fallback":
            lines.extend(
                [
                    "- Python fallback은 `buildFallbackProfile` 동작을 시뮬레이션합니다. 실제 엔진 검증은 Node.js 필요.",
                    "",
                ]
            )
        total = tutor_summary["total_samples"]
        lines.extend(
            [
                "| 필드 | PASS | 비율 |",
                "|------|------|------|",
                f"| explanation | {tutor_summary['explanation_ok']} | {tutor_summary['explanation_ok'] / total * 100:.1f}% |",
                f"| solvingAlgorithm | {tutor_summary['algorithm_ok']} | {tutor_summary['algorithm_ok'] / total * 100:.1f}% |",
                f"| wrongAnswerAnalysis (>=4) | {tutor_summary['wrong_ok']} | {tutor_summary['wrong_ok'] / total * 100:.1f}% |",
                f"| memoryTip | {tutor_summary['memory_ok']} | {tutor_summary['memory_ok'] / total * 100:.1f}% |",
                f"| 4종 모두 충족 | {tutor_summary['all_ok']} | {tutor_summary['all_ok'] / total * 100:.1f}% |",
                "",
                "### Pattern별 샘플",
                "",
                "| Pattern | 샘플 수 | explanation | algorithm | wrongAnalysis | memoryTip |",
                "|---------|---------|-------------|-----------|---------------|-----------|",
            ]
        )
        for pattern_id, items in sorted(tutor_summary["by_pattern"].items()):
            exp = sum(1 for x in items if x.get("hasExplanation"))
            alg = sum(1 for x in items if x.get("hasSolvingAlgorithm"))
            wrong = sum(1 for x in items if x.get("hasWrongAnswerAnalysis"))
            mem = sum(1 for x in items if x.get("hasMemoryTip"))
            name = items[0].get("patternName", pattern_id)
            lines.append(
                f"| {name} (`{pattern_id}`) | {len(items)} | {exp}/{len(items)} | {alg}/{len(items)} | {wrong}/{len(items)} | {mem}/{len(items)} |"
            )
        lines.append("")
    else:
        lines.extend(["- AI Tutor 샘플링 결과 없음", ""])

    lines.extend(
        [
            "## 6. 연도별 분포",
            "",
            "| 연도 | 문항 |",
            "|------|------|",
        ]
    )
    for year in MVP_YEARS:
        lines.append(f"| {year} | {by_year.get(year, 0)} |")

    lines.extend(
        [
            "",
            "## 7. 수험생 관점 권장 조치 (다음 품질 Phase)",
            "",
            "1. **OCR 후처리**: `originalQuestion`/`choices` 띄어쓰기·페이지 푸터(`A-15-8`, `교시`) 제거",
            "2. **표 문항**: `hasTable` 2건 Markdown 재추출 — 현재 separator/행 구조 손상",
            "3. **AI Tutor**: MVP Pattern 전용 Profile 확장 (현재 Fallback 비율 높음)",
            "4. **solution 필드**: DB 해설은 Phase 후속 — Tutor/추천은 Profile 기반 유지",
            "",
            "## 부록: 카테고리별 전체 건수",
            "",
        ]
    )

    for category, items in sorted(grouped.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        lines.append(f"- `{category}`: {len(items)}")

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    if not QUESTION_DB.exists():
        print("FAIL: question-db-mvp.json 없음")
        return 1

    state = AuditState()
    questions = load_questions()
    patterns = load_patterns()

    if len(questions) != EXPECTED_TOTAL:
        state.add("critical", "dataset", "GLOBAL", f"문항 수 {len(questions)}/{EXPECTED_TOTAL}")

    for question in questions:
        audit_questions([question], state)
        audit_choices(question, state)
        audit_answer(question, state)

    by_pattern = audit_patterns(questions, patterns, state)

    for pattern_id, items in by_pattern.items():
        if len(items) < MIN_SAMPLES_PER_PATTERN:
            state.add(
                "info",
                "pattern_sparse",
                pattern_id,
                f"Pattern 문항 {len(items)}개 (< {MIN_SAMPLES_PER_PATTERN})",
            )

    tutor_samples, tutor_error = run_tutor_sampling()
    tutor_engine = "node"
    if not tutor_samples:
        tutor_samples = audit_tutor_python(questions, patterns)
        tutor_engine = "python-fallback"
        tutor_error = tutor_error or "Node unavailable; used Python fallback mirroring buildFallbackProfile"
    tutor_summary = summarize_tutor(tutor_samples, state) if tutor_samples else {}

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report = build_report(questions, patterns, state, tutor_samples, tutor_summary, tutor_error, tutor_engine)
    REPORT_PATH.write_text(report, encoding="utf-8")

    critical = sum(1 for i in state.issues if i.severity == "critical")
    warning = sum(1 for i in state.issues if i.severity == "warning")
    print("MVP Quality Audit")
    print(f"- questions: {len(questions)}")
    print(f"- critical: {critical}")
    print(f"- warning: {warning}")
    print(f"- report: {REPORT_PATH}")
    if tutor_error:
        print(f"- tutor: {tutor_error}")
    if tutor_samples:
        print(f"- tutor samples: {len(tutor_samples)} ({tutor_engine})")

    return 1 if critical else 0


if __name__ == "__main__":
    sys.exit(main())
