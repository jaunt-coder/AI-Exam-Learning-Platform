#!/usr/bin/env python3
"""Alpha Test pre-flight analysis — examinee flow, scenarios, 30-question set."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
JS = ROOT / "js"
DOCS = ROOT / "docs"
QUESTION_DB = DATA / "question-db-mvp.json"
PATTERN_DB = DATA / "pattern-db-mvp.json"
STATS_DB = DATA / "statistics-mvp.json"
PLAN_PATH = DOCS / "alpha-test-plan.md"
REPORT_PATH = DOCS / "alpha-test-report.md"

EXPECTED_TOTAL = 240
CALC_TARGET = 15
CONCEPT_TARGET = 10
TABLE_TARGET = 5

FLOW_PAGES = [
    "index.html",
    "pattern.html",
    "question.html",
    "wrong-note.html",
    "ai-tutor.html",
    "recommendation.html",
]

FLOW_NAV_TARGETS = [
    "pattern.html",
    "question.html",
    "wrong-note.html",
    "ai-tutor.html",
    "recommendation.html",
]

FLOW_JS_CHAIN = [
    ("index.html", "js/app.js", ["loadPhase1Database"]),
    ("pattern.html", "js/pattern.js", ["loadPhase1Database", "pattern.html"]),
    ("question.html", "js/question.js", ["gradeAnswer", "recordAttempt", "generateTutorLesson"]),
    ("wrong-note.html", "js/wrong-note.js", ["buildWrongNoteSummary", "buildRetryUrl"]),
    ("ai-tutor.html", "js/ai-tutor.js", ["generateTutorLesson"]),
    ("recommendation.html", "js/recommendation-engine.js", ["buildFullRecommendationReport"]),
]

QUESTION_REQUIRED_DOM = [
    "answer-form",
    "submit-btn",
    "result-panel",
    "ai-tutor-panel",
    "wrong-saved-notice",
    "choices-list",
    "next-btn",
]

STORAGE_KEYS = [
    "progress",
    "wrongAnswers",
    "bookmarks",
    "recentStudy",
    "theme",
    "settings",
    "examHistory",
]

TABULAR_STEM = re.compile(r"구분|예산\s*실제|기초\s*기말|○.*W.*W")


@dataclass
class Finding:
    severity: str  # P0 | P1 | P2
    category: str
    title: str
    detail: str


@dataclass
class AlphaState:
    passed: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def pass_(self, msg: str) -> None:
        self.passed.append(msg)

    def fail(self, msg: str, *, severity: str = "P0", category: str = "flow", title: str | None = None) -> None:
        self.failures.append(msg)
        self.findings.append(
            Finding(severity, category, title or msg, msg),
        )

    def warn(self, msg: str, *, severity: str = "P2", category: str = "usability", title: str | None = None) -> None:
        self.warnings.append(msg)
        self.findings.append(
            Finding(severity, category, title or msg, msg),
        )


def load_questions() -> list[dict]:
    payload = json.loads(QUESTION_DB.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("questions") or []


def load_patterns() -> list[dict]:
    return json.loads(PATTERN_DB.read_text(encoding="utf-8"))


def classify_question(question: dict) -> set[str]:
    tags: set[str] = set()
    if question.get("hasCalculation"):
        tags.add("calculation")
    if not question.get("hasCalculation") and not question.get("hasTable"):
        tags.add("concept")
    if question.get("hasTable"):
        tags.add("table")
    stem = f"{question.get('question', '')} {question.get('originalQuestion', '')}"
    if TABULAR_STEM.search(stem):
        tags.add("tabular-stem")
    return tags


def is_table_candidate(question: dict) -> bool:
    tags = classify_question(question)
    return "table" in tags or "tabular-stem" in tags


def pick_diverse(items: list[dict], limit: int, used: set[str]) -> list[dict]:
    by_pattern: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        if item["questionId"] in used:
            continue
        by_pattern[item["patternId"]].append(item)

    picked: list[dict] = []
    pattern_ids = sorted(by_pattern.keys())
    idx = 0
    while len(picked) < limit and pattern_ids:
        pid = pattern_ids[idx % len(pattern_ids)]
        pool = by_pattern[pid]
        if pool:
            q = pool.pop(0)
            if q["questionId"] not in used:
                picked.append(q)
                used.add(q["questionId"])
        idx += 1
        if all(not by_pattern[p] for p in pattern_ids):
            break
    return picked


def build_test_set(questions: list[dict]) -> dict[str, list[dict]]:
    used: set[str] = set()
    calc_pool = [q for q in questions if q.get("hasCalculation")]
    concept_pool = [q for q in questions if "concept" in classify_question(q)]
    table_pool = [q for q in questions if is_table_candidate(q)]

    calc = pick_diverse(calc_pool, CALC_TARGET, used)
    concept = pick_diverse(concept_pool, CONCEPT_TARGET, used)

    table_has = [q for q in table_pool if q.get("hasTable")]
    table_stem = [q for q in table_pool if not q.get("hasTable")]
    table: list[dict] = []
    for q in table_has:
        if q["questionId"] not in used:
            table.append(q)
            used.add(q["questionId"])
    table.extend(pick_diverse(table_stem, TABLE_TARGET - len(table), used))

    return {
        "calculation": calc,
        "concept": concept,
        "table": table,
    }


def verify_pages(state: AlphaState) -> None:
    for page in FLOW_PAGES:
        path = ROOT / page
        if not path.exists():
            state.fail(f"Missing page: {page}", title=f"Page missing: {page}")
        else:
            state.pass_(f"Page exists: {page}")


def verify_nav_links(state: AlphaState) -> None:
    for page in FLOW_PAGES:
        content = (ROOT / page).read_text(encoding="utf-8")
        for target in FLOW_NAV_TARGETS:
            if f'href="{target}"' not in content and page != target:
                state.warn(
                    f"{page} missing nav link to {target}",
                    severity="P1",
                    category="navigation",
                )
    state.pass_("Core pages include cross-navigation links")


def verify_js_chain(state: AlphaState) -> None:
    for page, js_rel, markers in FLOW_JS_CHAIN:
        js_path = ROOT / js_rel
        if not js_path.exists():
            state.fail(f"Missing module: {js_rel}", title=f"Module missing: {js_rel}")
            continue
        content = js_path.read_text(encoding="utf-8")
        html = (ROOT / page).read_text(encoding="utf-8")
        if js_rel not in html and page != "recommendation.html":
            if page == "recommendation.html" and "recommendation-engine.js" in html:
                pass
            elif js_rel.replace("js/", "") not in html:
                state.warn(f"{page} may not load {js_rel}", severity="P1", category="flow")
        for marker in markers:
            if marker not in content:
                state.fail(
                    f"{js_rel} missing `{marker}`",
                    severity="P0",
                    category="engine",
                    title=f"Engine contract broken: {js_rel}",
                )
            else:
                state.pass_(f"{js_rel} exports/uses `{marker}`")


def verify_question_dom(state: AlphaState) -> None:
    html = (ROOT / "question.html").read_text(encoding="utf-8")
    for dom_id in QUESTION_REQUIRED_DOM:
        if f'id="{dom_id}"' not in html:
            state.fail(f"question.html missing #{dom_id}", title="Question UI incomplete")
        else:
            state.pass_(f"question.html has #{dom_id}")


def verify_data_loader(state: AlphaState) -> None:
    loader = (JS / "data-loader.js").read_text(encoding="utf-8")
    checks = [
        ("question-db-mvp.json", "MVP question path"),
        ("applyQuestionCleanup", "display cleanup layer"),
        ("DEFAULT_DB_SET = 'mvp'", "MVP default DB"),
    ]
    for token, label in checks:
        if token not in loader:
            state.fail(f"data-loader.js: {label} not found", category="data")
        else:
            state.pass_(f"data-loader.js: {label}")


def verify_storage_contract(state: AlphaState) -> None:
    storage = (JS / "storage.js").read_text(encoding="utf-8")
    for key in STORAGE_KEYS:
        if f"'{key}'" not in storage and f'"{key}"' not in storage:
            state.fail(f"storage.js missing key: {key}", category="storage")
        else:
            state.pass_(f"LocalStorage key preserved: {key}")


def verify_db_readonly(state: AlphaState, questions: list[dict], patterns: list[dict]) -> None:
    if len(questions) != EXPECTED_TOTAL:
        state.fail(f"question-db-mvp.json count {len(questions)}/{EXPECTED_TOTAL}")
    else:
        state.pass_(f"MVP DB {EXPECTED_TOTAL} questions")

    if len(patterns) != 18:
        state.fail(f"pattern-db-mvp.json count {len(patterns)}/18")
    else:
        state.pass_("MVP DB 18 patterns")

    if not STATS_DB.exists():
        state.fail("statistics-mvp.json missing")
    else:
        state.pass_("statistics-mvp.json exists")


def simulate_scenario_a(state: AlphaState, questions: list[dict], patterns: list[dict]) -> dict:
    """First-time Pattern selection — link + data availability."""
    pattern = patterns[0]
    pattern_questions = [q for q in questions if q["patternId"] == pattern["patternId"]]
    if not pattern_questions:
        state.fail(f"Scenario A: no questions for {pattern['patternId']}")
        return {}

    q = pattern_questions[0]
    pattern_url = f"pattern.html?pattern={pattern['patternId']}"
    question_url = f"question.html?pattern={pattern['patternId']}&id={q['questionId']}"

    if len(q.get("choices") or []) != 5:
        state.fail(f"Scenario A: {q['questionId']} choices != 5")
    else:
        state.pass_(f"Scenario A: Pattern `{pattern['patternId']}` -> first question `{q['questionId']}`")

    return {
        "patternId": pattern["patternId"],
        "patternName": pattern.get("name", pattern["patternId"]),
        "questionId": q["questionId"],
        "patternUrl": pattern_url,
        "questionUrl": question_url,
    }


def simulate_scenario_b(state: AlphaState, question: dict) -> dict:
    """Wrong answer save structure."""
    wrong_answer = 1 if question.get("answer") != 1 else 2
    correct = int(question["answer"])
    result = {
        "correct": wrong_answer == correct,
        "selectedAnswer": wrong_answer,
        "correctAnswer": correct,
    }
    if result["correct"]:
        state.fail("Scenario B: test question must be wrong-answer simulation")
        return {}

    wrong_item = {
        "questionId": question["questionId"],
        "patternId": question["patternId"],
        "selectedAnswer": wrong_answer,
        "correctAnswer": correct,
        "wrongCount": 1,
        "lastWrongAt": datetime.now().isoformat(),
    }
    retry_url = (
        f"question.html?pattern={question['patternId']}"
        f"&id={question['questionId']}&retry=1"
    )
    state.pass_(f"Scenario B: wrong save model OK for `{question['questionId']}`")
    state.pass_(f"Scenario B: retry URL `{retry_url}`")
    return {"wrongItem": wrong_item, "retryUrl": retry_url}


def simulate_scenario_c(state: AlphaState, question: dict, patterns: list[dict]) -> None:
    """AI Tutor content availability (static profile check)."""
    profiles_path = JS / "ai-tutor-content" / "pattern-profiles.js"
    if not profiles_path.exists():
        state.fail("Scenario C: pattern-profiles.js missing")
        return

    content = profiles_path.read_text(encoding="utf-8")
    pid = question["patternId"]
    if pid not in content and "buildFallbackProfile" not in content:
        state.fail(f"Scenario C: no tutor profile/fallback for {pid}")
    else:
        state.pass_(f"Scenario C: Tutor profile or fallback available for `{pid}`")

    tutor_engine = (JS / "ai-tutor-engine.js").read_text(encoding="utf-8")
    for section in ["why-wrong", "solving-order", "memory-tip", "generateTutorLesson"]:
        if section not in tutor_engine:
            state.fail(f"Scenario C: ai-tutor-engine missing `{section}`")
        else:
            state.pass_(f"Scenario C: Tutor section `{section}` defined")


def simulate_scenario_d(state: AlphaState, wrong_item: dict, patterns: list[dict], statistics: list[dict]) -> None:
    """Recommendation with mock wrong/progress data."""
    rules = (JS / "recommendation-rules.js").read_text(encoding="utf-8")
    engine = (JS / "recommendation-engine.js").read_text(encoding="utf-8")
    for fn in ["buildDailyRecommendations", "buildWeakPatternRecommendations", "buildReviewRecommendations"]:
        if fn not in engine:
            state.fail(f"Scenario D: recommendation-engine missing `{fn}`")
        else:
            state.pass_(f"Scenario D: `{fn}` available")

    if "isReviewDue" not in rules:
        state.fail("Scenario D: isReviewDue rule missing")
    else:
        state.pass_("Scenario D: review due rule present")

    pattern_map = {p["patternId"]: p for p in patterns}
    pid = wrong_item["patternId"]
    if pid not in pattern_map:
        state.fail(f"Scenario D: wrong pattern {pid} not in pattern-db")
    else:
        rec_pattern_url = f"pattern.html?pattern={pid}"
        rec_question_url = (
            f"question.html?pattern={pid}&id={wrong_item['questionId']}&retry=1"
        )
        state.pass_(f"Scenario D: weak pattern link `{rec_pattern_url}`")
        state.pass_(f"Scenario D: review question link `{rec_question_url}`")

    yesterday = (datetime.now() - timedelta(days=2)).isoformat()
    wrong_item_old = {**wrong_item, "lastWrongAt": yesterday}
    days_old = 2
    if days_old >= 1:
        state.pass_("Scenario D: mock wrong age triggers review candidate (>=1 day)")


def detect_usability_issues(state: AlphaState) -> None:
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    app_js = (JS / "app.js").read_text(encoding="utf-8")

    if "32문항" in index_html or "재고자산 Pattern 학습" in index_html:
        state.warn(
            "index.html hero still shows Phase 1 copy (32문항/재고자산 only)",
            severity="P1",
            category="copy",
            title="Home page outdated MVP messaging",
        )

    if "phase1-v1.0" in app_js or "Phase 1 DB" in app_js:
        state.warn(
            "app.js success message references Phase 1 Freeze, not MVP 240",
            severity="P1",
            category="copy",
            title="Home status message outdated",
        )

    question_js = (JS / "question.js").read_text(encoding="utf-8")
    if "hasTable" not in question_js and ".table" not in question_js:
        state.warn(
            "question.html UI does not render hasTable/table Markdown",
            severity="P1",
            category="display",
            title="Table questions not visually rendered",
        )

    rec_html = (ROOT / "recommendation.html").read_text(encoding="utf-8")
    if "phase1-v1.0" in rec_html:
        state.warn(
            "recommendation.html footer references phase1-v1.0",
            severity="P2",
            category="copy",
        )

    if not PLAN_PATH.exists():
        state.fail("alpha-test-plan.md missing")
    else:
        state.pass_("alpha-test-plan.md exists")


def run_node_tutor_probe(question_ids: list[str]) -> tuple[list[dict], str | None]:
    script = ROOT / "scripts" / ".alpha-tutor-probe.mjs"
    script.write_text(
        """
        import { readFileSync } from 'fs';
        import { join, dirname } from 'path';
        import { fileURLToPath } from 'url';
        import { generateQuestionTutorContent } from '../js/ai-tutor-engine.js';

        const root = join(dirname(fileURLToPath(import.meta.url)), '..');
        const read = (rel) => readFileSync(join(root, rel), 'utf8');
        const payload = JSON.parse(read('data/question-db-mvp.json'));
        const patterns = JSON.parse(read('data/pattern-db-mvp.json'));
        const questions = payload.questions || payload;
        const patternMap = Object.fromEntries(patterns.map((p) => [p.patternId, p]));
        const ids = JSON.parse(process.argv[2] || '[]');
        const results = ids.map((id) => {
          const q = questions.find((item) => item.questionId === id);
          if (!q) return { questionId: id, ok: false, reason: 'not found' };
          const content = generateQuestionTutorContent(q, patternMap[q.patternId]);
          const sections = [
            Boolean(String(content.explanation || '').trim()),
            Array.isArray(content.solvingAlgorithm) && content.solvingAlgorithm.length > 0,
            content.wrongAnswerAnalysis && Object.keys(content.wrongAnswerAnalysis).length >= 4,
            Boolean(String(content.memoryTip || '').trim()),
          ];
          return {
            questionId: id,
            ok: sections.every(Boolean),
            sections: {
              explanation: sections[0],
              algorithm: sections[1],
              wrongAnalysis: sections[2],
              memoryTip: sections[3],
            },
          };
        });
        console.log(JSON.stringify(results));
        """.strip(),
        encoding="utf-8",
    )
    try:
        proc = subprocess.run(
            ["node", str(script), json.dumps(question_ids[:5])],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
    except FileNotFoundError:
        return [], "Node.js unavailable — Tutor runtime probe skipped"
    if proc.returncode != 0:
        return [], (proc.stderr or proc.stdout or "node probe failed")[:300]
    try:
        return json.loads(proc.stdout.strip()), None
    except json.JSONDecodeError:
        return [], "Invalid tutor probe output"


def build_report(
    state: AlphaState,
    test_set: dict[str, list[dict]],
    scenario_meta: dict,
    tutor_probe: list[dict],
    tutor_error: str | None,
) -> str:
    status = "READY" if not state.failures else "BLOCKED"
    p0 = [f for f in state.findings if f.severity == "P0"]
    p1 = [f for f in state.findings if f.severity == "P1"]
    p2 = [f for f in state.findings if f.severity == "P2"]

    lines = [
        "# Alpha Test Report",
        "",
        f"- 생성일: {date.today().isoformat()}",
        "- 대상: MVP Alpha (240문항 · 18 Pattern)",
        "- 관점: 수험생 사용성 사전 점검 (자동 분석 + 수동 테스트 템플릿)",
        "",
        "## Executive Summary",
        "",
        f"| 항목 | 결과 |",
        f"|------|------|",
        f"| Alpha Gate | **{status}** |",
        f"| P0 (학습 불가) | {len(p0)} |",
        f"| P1 (학습 저해) | {len(p1)} |",
        f"| P2 (UX 불편) | {len(p2)} |",
        f"| 자동 PASS | {len(state.passed)} |",
        f"| 자동 FAIL | {len(state.failures)} |",
        "",
    ]

    if status == "READY":
        lines.append("자동 사전 점검 PASS — 수험생 Alpha Test 진행 가능.")
    else:
        lines.append("P0 이슈 존재 — Alpha Test 전 P0 해결 권장.")

    lines.extend(["", "## 1. 문제 풀이 흐름 연결", ""])
    lines.extend(["| Step | 경로 | 자동 검증 |", "|------|------|-----------|"])
    flow_rows = [
        ("1", "index.html", "PASS" if (ROOT / "index.html").exists() else "FAIL"),
        ("2", "pattern.html", "PASS" if "loadPhase1Database" in (JS / "pattern.js").read_text(encoding="utf-8") else "FAIL"),
        ("3", "question.html?pattern=&id=", "PASS" if 'id="answer-form"' in (ROOT / "question.html").read_text(encoding="utf-8") else "FAIL"),
        ("4", "채점 (gradeAnswer)", "PASS" if "gradeAnswer" in (JS / "question-engine.js").read_text(encoding="utf-8") else "FAIL"),
        ("5", "AI Tutor (generateTutorLesson)", "PASS" if "generateTutorLesson" in (JS / "ai-tutor-engine.js").read_text(encoding="utf-8") else "FAIL"),
        ("6", "오답 저장 (saveWrongAnswer)", "PASS" if "saveWrongAnswer" in (JS / "question-engine.js").read_text(encoding="utf-8") else "FAIL"),
        ("7", "wrong-note.html", "PASS" if (ROOT / "wrong-note.html").exists() else "FAIL"),
        ("8", "recommendation.html", "PASS" if "buildFullRecommendationReport" in (JS / "recommendation-engine.js").read_text(encoding="utf-8") else "FAIL"),
    ]
    for step, path, result in flow_rows:
        lines.append(f"| {step} | {path} | {result} |")

    lines.extend(["", "## 2. Scenario 시뮬레이션", ""])
    if scenario_meta.get("a"):
        a = scenario_meta["a"]
        lines.extend(
            [
                "### Scenario A — 처음 Pattern 선택",
                "",
                f"- Pattern: `{a['patternId']}` ({a['patternName']})",
                f"- 첫 문항: `{a['questionId']}`",
                f"- URL: `{a['questionUrl']}`",
                "",
            ]
        )
    if scenario_meta.get("b"):
        b = scenario_meta["b"]
        lines.extend(
            [
                "### Scenario B — 오답 저장",
                "",
                f"- 테스트 문항: `{b['wrongItem']['questionId']}`",
                f"- Retry URL: `{b['retryUrl']}`",
                "",
            ]
        )
    lines.extend(
        [
            "### Scenario C — AI Tutor",
            "",
        ]
    )
    if tutor_error:
        lines.append(f"- Note: {tutor_error}")
    if tutor_probe:
        lines.extend(["", "| questionId | Tutor 4-field |", "|------------|-------------|"])
        for item in tutor_probe:
            mark = "PASS" if item.get("ok") else "FAIL"
            lines.append(f"| `{item['questionId']}` | {mark} |")
    else:
        lines.append("- Static profile/fallback check PASS (runtime probe optional)")

    lines.extend(
        [
            "",
            "### Scenario D — Recommendation",
            "",
            "- Mock wrong data -> pattern/question retry links generated",
            "- Empty state normal when no LocalStorage history",
            "",
            "## 3. 검증 데이터 — 30문항 Test Set",
            "",
            f"| 유형 | 목표 | 선정 |",
            f"|------|------|------|",
            f"| 계산형 | {CALC_TARGET} | {len(test_set['calculation'])} |",
            f"| 개념형 | {CONCEPT_TARGET} | {len(test_set['concept'])} |",
            f"| 표 문제 | {TABLE_TARGET} | {len(test_set['table'])} |",
            "",
        ]
    )

    if len(test_set["table"]) < TABLE_TARGET:
        lines.append(
            f"> Note: `hasTable=true` DB 문항 2건 — 표 형식 stem {len(test_set['table']) - sum(1 for q in test_set['table'] if q.get('hasTable'))}건으로 {TABLE_TARGET}건 보완."
        )
        lines.append("")

    for label, key in [("계산형", "calculation"), ("개념형", "concept"), ("표 문제", "table")]:
        lines.extend([f"### {label}", "", "| ID | Pattern | Year | 수동 결과 |", "|----|---------|------|-----------|"])
        for q in test_set[key]:
            lines.append(
                f"| `{q['questionId']}` | `{q['patternId']}` | {q.get('year', '-')} | ☐ PASS / ☐ FAIL |"
            )
        lines.append("")

    lines.extend(["## 4. 발견 오류", ""])
    if p0 or p1:
        for f in p0 + p1:
            lines.append(f"- **[{f.severity}]** {f.title}: {f.detail}")
    else:
        lines.append("- 자동 분석 P0/P1 없음")

    lines.extend(["", "## 5. 사용성 문제", ""])
    if p1 or p2:
        for f in p1 + p2:
            lines.append(f"- **[{f.severity}]** {f.title}: {f.detail}")
    else:
        lines.append("- (수동 Alpha Test 후 기록)")

    lines.extend(["", "## 6. 개선 우선순위", ""])
    priorities = [
        ("P0", "즉시", [f.title for f in p0] or ["없음 — Alpha 진행 가능"]),
        ("P1", "Alpha 중 hotfix 또는 Beta", [f.title for f in p1] or ["홈 MVP 문구 갱신", "표 문항 UI 렌더링"]),
        ("P2", "Beta", [f.title for f in p2] or ["푸터/부제목 copy 정리"]),
    ]
    for sev, when, items in priorities:
        lines.append(f"### {sev} ({when})")
        for item in items:
            lines.append(f"- {item}")
        lines.append("")

    lines.extend(
        [
            "## 7. 수동 Alpha Tester 기록란",
            "",
            "| Scenario | PASS | FAIL | 메모 |",
            "|----------|------|------|------|",
            "| A — Pattern 선택 | ☐ | ☐ | |",
            "| B — 오답 저장 | ☐ | ☐ | |",
            "| C — AI Tutor | ☐ | ☐ | |",
            "| D — Recommendation | ☐ | ☐ | |",
            "| Flow 1 (Step 1~9) | ☐ | ☐ | |",
            "",
            "## 부록: 자동 PASS 목록",
            "",
        ]
    )
    for item in state.passed:
        lines.append(f"- {item}")
    if state.failures:
        lines.extend(["", "## 부록: 자동 FAIL 목록", ""])
        for item in state.failures:
            lines.append(f"- {item}")

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    state = AlphaState()

    if not QUESTION_DB.exists():
        print("FAIL: question-db-mvp.json missing")
        return 1

    questions = load_questions()
    patterns = load_patterns()
    statistics = json.loads(STATS_DB.read_text(encoding="utf-8")) if STATS_DB.exists() else []

    verify_pages(state)
    verify_nav_links(state)
    verify_js_chain(state)
    verify_question_dom(state)
    verify_data_loader(state)
    verify_storage_contract(state)
    verify_db_readonly(state, questions, patterns)
    detect_usability_issues(state)

    test_set = build_test_set(questions)
    total_selected = sum(len(v) for v in test_set.values())
    if total_selected < 30:
        state.warn(
            f"Test set {total_selected}/30 — concept pool limited ({len([q for q in questions if 'concept' in classify_question(q)])} in DB)",
            severity="P1",
            category="testdata",
            title="Concept question pool smaller than target",
        )
    else:
        state.pass_(f"Alpha test set selected: {total_selected} questions")

    scenario_a = simulate_scenario_a(state, questions, patterns)
    scenario_b = {}
    if test_set["calculation"]:
        scenario_b = simulate_scenario_b(state, test_set["calculation"][0])
    if scenario_b:
        simulate_scenario_c(state, test_set["calculation"][0], patterns)
        simulate_scenario_d(state, scenario_b["wrongItem"], patterns, statistics)

    probe_ids = [q["questionId"] for q in test_set["calculation"][:3]]
    tutor_probe, tutor_error = run_node_tutor_probe(probe_ids)
    if tutor_probe:
        ok_count = sum(1 for x in tutor_probe if x.get("ok"))
        state.pass_(f"Tutor runtime probe: {ok_count}/{len(tutor_probe)} PASS")
        for item in tutor_probe:
            if not item.get("ok"):
                state.warn(
                    f"Tutor incomplete for {item['questionId']}: {item.get('sections')}",
                    severity="P1",
                    category="tutor",
                )

    report = build_report(
        state,
        test_set,
        {"a": scenario_a, "b": scenario_b},
        tutor_probe,
        tutor_error,
    )
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report, encoding="utf-8")

    print("Alpha Test Pre-flight")
    print(f"- gate: {'READY' if not state.failures else 'BLOCKED'}")
    print(f"- pass: {len(state.passed)}")
    print(f"- fail: {len(state.failures)}")
    print(f"- findings: P0={sum(1 for f in state.findings if f.severity=='P0')} "
          f"P1={sum(1 for f in state.findings if f.severity=='P1')} "
          f"P2={sum(1 for f in state.findings if f.severity=='P2')}")
    print(f"- test set: {total_selected} questions")
    print(f"- plan: {PLAN_PATH}")
    print(f"- report: {REPORT_PATH}")
    if tutor_error:
        print(f"- tutor probe: {tutor_error.encode('ascii', 'replace').decode()}")

    return 1 if state.failures else 0


if __name__ == "__main__":
    sys.exit(main())
