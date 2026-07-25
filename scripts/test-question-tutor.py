# -*- coding: utf-8 -*-
"""Sprint-11C — Question Tutor AI Coach tests."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"

RESPONSE_KEYS = [
    "title",
    "summary",
    "correctAnswer",
    "whyWrong",
    "mistakeType",
    "stepByStep",
    "keyConcept",
    "relatedPattern",
    "reviewChecklist",
    "similarTrap",
    "nextQuestion",
    "confidence",
]

MISTAKE_TYPES = {
    "CALCULATION",
    "CONCEPT",
    "MEMORIZATION",
    "MISREAD",
    "TIME_PRESSURE",
    "UNKNOWN",
}


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


def validate_response(value):
    errors = []
    if not isinstance(value, dict):
        return False, ["response_not_object"], None
    for key in RESPONSE_KEYS:
        if key not in value or value[key] is None:
            errors.append(f"missing:{key}")
    mt = value.get("mistakeType")
    if mt is not None:
        mt_u = str(mt).upper()
        if mt_u not in MISTAKE_TYPES:
            errors.append("invalid:mistakeType")
    else:
        mt_u = None
    if errors:
        return False, errors, None
    steps = value["stepByStep"]
    checklist = value["reviewChecklist"]
    if not isinstance(steps, list):
        steps = [str(steps)]
    if not isinstance(checklist, list):
        checklist = [str(checklist)]
    conf = value["confidence"]
    if isinstance(conf, str):
        try:
            conf = float(conf)
        except ValueError:
            conf = 0.5
    if not isinstance(conf, (int, float)):
        conf = 0.5
    conf = max(0.0, min(1.0, float(conf)))
    data = {
        "title": str(value["title"]),
        "summary": str(value["summary"]),
        "correctAnswer": str(value["correctAnswer"]),
        "whyWrong": str(value["whyWrong"]),
        "mistakeType": mt_u,
        "stepByStep": [str(x) for x in steps],
        "keyConcept": str(value["keyConcept"]),
        "relatedPattern": str(value["relatedPattern"]),
        "reviewChecklist": [str(x) for x in checklist],
        "similarTrap": str(value["similarTrap"]),
        "nextQuestion": str(value["nextQuestion"]),
        "confidence": conf,
    }
    return True, [], data


def infer_mistake_type(snapshot):
    attempt = snapshot.get("attempt") or {}
    explicit = attempt.get("mistakeType")
    if explicit and str(explicit).upper() in MISTAKE_TYPES:
        return str(explicit).upper()
    weakness = str(((snapshot.get("weakness") or {}).get("weaknessType") or "")).upper()
    if "CALC" in weakness:
        return "CALCULATION"
    if "CONCEPT" in weakness:
        return "CONCEPT"
    if "MEMOR" in weakness:
        return "MEMORIZATION"
    if "SLOW" in weakness or "TIME" in weakness:
        return "TIME_PRESSURE"
    if attempt.get("isCorrect") is True:
        return "UNKNOWN"
    return "UNKNOWN"


def rule_fallback(snapshot):
    q = snapshot.get("question") or {}
    attempt = snapshot.get("attempt") or {}
    pattern = (snapshot.get("pattern") or {}).get("patternId") or "UNKNOWN"
    qid = q.get("id") or attempt.get("questionId") or "UNKNOWN"
    correct = str(q.get("answer") if q.get("answer") is not None else "정답 확인")
    selected = str(
        attempt.get("selectedAnswer") if attempt.get("selectedAnswer") is not None else "미응답"
    )
    is_correct = attempt.get("isCorrect") is True
    mt = infer_mistake_type(snapshot)
    return {
        "title": f"{qid} Question Tutor",
        "summary": (
            f"{qid}는 정답입니다. Pattern({pattern}) 구조를 정리하세요."
            if is_correct
            else f"{qid} 오답입니다. 선택({selected})과 정답({correct})을 복기하세요."
        ),
        "correctAnswer": correct,
        "whyWrong": (
            "정답입니다. 유사 함정을 메모하세요."
            if is_correct
            else f"학생이 {selected}를 고른 이유는 {mt} 유형입니다."
        ),
        "mistakeType": mt,
        "stepByStep": ["요구사항 정리", "선택지 대조", "정답 근거 작성"],
        "keyConcept": f"{pattern} Pattern 핵심 개념",
        "relatedPattern": pattern,
        "reviewChecklist": ["오답 차이 한 줄", f"mistakeType({mt}) 메모"],
        "similarTrap": "숫자만 바꾼 동일 Pattern 함정",
        "nextQuestion": f"다음: {pattern} Pattern 유사 문항",
        "confidence": 0.5,
    }


def pattern_tutor_map(snapshot):
    """Simulate Pattern Tutor -> Question Tutor mapping."""
    pattern = (snapshot.get("pattern") or {}).get("patternId") or "UNKNOWN"
    pt = {
        "title": f"{pattern} Pattern Tutor",
        "summary": f"{pattern} Pattern 복습",
        "whyWrong": "Pattern 이해 부족",
        "patternExplanation": f"{pattern} 핵심 설명",
        "commonMistakes": ["정답만 외움", "조건 누락"],
        "reviewChecklist": ["개념 복기", "알고리즘 재작성"],
        "nextStudy": f"{pattern} 이어서 복습",
        "confidence": 0.55,
    }
    rule = rule_fallback(snapshot)
    mapped = {
        "title": pt["title"],
        "summary": pt["summary"],
        "correctAnswer": rule["correctAnswer"],
        "whyWrong": pt["whyWrong"],
        "mistakeType": infer_mistake_type(snapshot),
        "stepByStep": pt["commonMistakes"],
        "keyConcept": pt["patternExplanation"],
        "relatedPattern": pattern,
        "reviewChecklist": pt["reviewChecklist"],
        "similarTrap": pt["commonMistakes"][0],
        "nextQuestion": pt["nextStudy"],
        "confidence": pt["confidence"],
    }
    return validate_response(mapped)


def simulate_generate(snapshot, llm_factory, max_retries=2):
    last_error = None
    attempts = 0
    for attempt in range(max_retries + 1):
        attempts = attempt + 1
        result = llm_factory(attempt, snapshot)
        if not result.get("ok"):
            last_error = result.get("error") or "llm_failed"
            continue
        ok, errors, data = validate_response(result.get("json"))
        if not ok:
            last_error = ",".join(errors)
            continue
        return {
            "ok": True,
            "fallback": False,
            "source": "llm",
            "attempts": attempts,
            "response": data,
            "error": None,
            "schemaValidated": True,
        }

    # Fallback: Pattern Tutor -> Rule Coach
    ok_map, _, mapped = pattern_tutor_map(snapshot)
    if ok_map:
        return {
            "ok": True,
            "fallback": True,
            "source": "pattern_tutor",
            "attempts": attempts,
            "response": mapped,
            "error": last_error,
            "schemaValidated": True,
        }
    fb = rule_fallback(snapshot)
    return {
        "ok": True,
        "fallback": True,
        "source": "rule_coach",
        "attempts": attempts,
        "response": fb,
        "error": last_error,
        "schemaValidated": True,
    }


# ── Freeze ──────────────────────────────────────────────────────────
qpath = ROOT / "data/question-db-mvp.json"
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
qs = json.loads(qpath.read_text(encoding="utf-8"))["questions"]
ps = json.loads((ROOT / "data/pattern-db-mvp.json").read_text(encoding="utf-8"))
assert len(qs) == 240
assert sum(1 for q in qs if q.get("primaryPattern")) == 20
assert (
    sum(
        1
        for p in ps
        if p.get("frequency")
        != sum(1 for q in qs if effective_pattern(q) == p["patternId"])
    )
    == 0
)
assert (ROOT / "data/learning-policy.json").exists()
assert (ROOT / "data/master-db.json").exists()

# ── Deliverables ────────────────────────────────────────────────────
tutor_js = (ROOT / "js/coach/question-tutor.js").read_text(encoding="utf-8")
prompt_js = (ROOT / "js/llm/question-prompt-builder.js").read_text(encoding="utf-8")
loader_js = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
dash_html = (ROOT / "dashboard.html").read_text(encoding="utf-8")
dash_page = (ROOT / "js/learning-dashboard-page.js").read_text(encoding="utf-8")
pattern_tutor_js = (ROOT / "js/coach/pattern-tutor.js").read_text(encoding="utf-8")

assert "export async function generateQuestionTutor" in tutor_js
assert "export function buildQuestionTutorPrompt" in prompt_js
assert "role: 'system'" in prompt_js or 'role: "system"' in prompt_js
assert "role: 'developer'" in prompt_js or 'role: "developer"' in prompt_js
assert "role: 'user'" in prompt_js or 'role: "user"' in prompt_js
assert "감정평가사 회계학 전문 튜터" in prompt_js
assert "QUESTION_TUTOR_TEMPERATURE = 0.2" in tutor_js
assert "QUESTION_TUTOR_MAX_RETRIES = 2" in tutor_js
assert "generatePatternTutor" in tutor_js
assert "export async function generatePatternTutor" in pattern_tutor_js
assert "card-question-tutor" in dash_html
assert "AI Question Tutor" in dash_html
assert "buildQuestionTutorDashboardCard" in dash_page
assert (ROOT / "docs/sprint-11C-question-tutor.md").exists()
assert (ROOT / "docs/sprint-11C-report.md").exists()

# ── validation.questionTutor ────────────────────────────────────────
assert re.search(r"questionTutor\s*:", loader_js)
assert "provider: 'openai'" in loader_js
assert "schemaValidated: true" in loader_js
assert "fallback: true" in loader_js

# ── Storage read-only ───────────────────────────────────────────────
assert "setItem(" not in tutor_js
assert "LEARNING_ATTEMPTS_V1" in tutor_js
assert "LEARNING_MASTERY_V1" in tutor_js or "readLearningStateReadonly" in tutor_js

# ── Runtime / Adapter / Pattern Tutor reuse ─────────────────────────
assert "createLlmClient" in tutor_js
assert "from '../llm/llm-client.js'" in tutor_js
assert "from './pattern-tutor.js'" in tutor_js
runtime = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "question-tutor" not in runtime
assert "generateQuestionTutor" not in runtime

# ── Schema validation ───────────────────────────────────────────────
base_ok = {
    "title": "t",
    "summary": "s",
    "correctAnswer": "2",
    "whyWrong": "w",
    "mistakeType": "CALCULATION",
    "stepByStep": ["a"],
    "keyConcept": "k",
    "relatedPattern": "P1",
    "reviewChecklist": ["c"],
    "similarTrap": "trap",
    "nextQuestion": "n",
    "confidence": 0.7,
}
ok, errs, data = validate_response(base_ok)
assert ok and data["mistakeType"] == "CALCULATION"

ok_bad, errs_bad, _ = validate_response({"title": "only"})
assert not ok_bad and any(e.startswith("missing:") for e in errs_bad)

ok_enum, errs_enum, _ = validate_response({**base_ok, "mistakeType": "WRONG"})
assert not ok_enum and "invalid:mistakeType" in errs_enum
print("PASS Schema Validation")

# ── Scenarios ───────────────────────────────────────────────────────
correct_q = {
    "question": {"id": "ACC_2015_Q051", "answer": 3, "patternId": "ACC-INV-001"},
    "attempt": {
        "questionId": "ACC_2015_Q051",
        "selectedAnswer": 3,
        "isCorrect": True,
    },
    "pattern": {"patternId": "ACC-INV-001"},
    "mastery": {"masteryLevel": "PROFICIENT"},
    "weakness": {"weaknessType": "NONE"},
    "recommendation": {"strategyType": "MAINTAIN", "patternId": "ACC-INV-001"},
}
wrong_q = {
    "question": {"id": "ACC_2015_Q052", "answer": 2, "patternId": "ACC-INV-001"},
    "attempt": {
        "questionId": "ACC_2015_Q052",
        "selectedAnswer": 4,
        "isCorrect": False,
    },
    "pattern": {"patternId": "ACC-INV-001"},
    "mastery": {"masteryLevel": "LEARNING"},
    "weakness": {"weaknessType": "LOW_ACCURACY"},
    "recommendation": {"strategyType": "FOCUSED_DRILL", "patternId": "ACC-INV-001"},
}
calc_q = {
    **wrong_q,
    "attempt": {**wrong_q["attempt"], "mistakeType": "CALCULATION"},
    "weakness": {"weaknessType": "CALCULATION_ERROR"},
}
concept_q = {
    **wrong_q,
    "attempt": {**wrong_q["attempt"], "mistakeType": "CONCEPT"},
    "weakness": {"weaknessType": "CONCEPT_ERROR"},
}
memo_q = {
    **wrong_q,
    "attempt": {**wrong_q["attempt"], "mistakeType": "MEMORIZATION"},
    "weakness": {"weaknessType": "MEMORIZATION"},
}


def good_llm(_attempt, snap):
    fb = rule_fallback(snap)
    fb["confidence"] = 0.9
    return {"ok": True, "json": fb}


for label, snap, expected_mt in (
    ("CORRECT", correct_q, "UNKNOWN"),
    ("WRONG", wrong_q, "UNKNOWN"),
    ("CALCULATION", calc_q, "CALCULATION"),
    ("CONCEPT", concept_q, "CONCEPT"),
    ("MEMORIZATION", memo_q, "MEMORIZATION"),
):
    out = simulate_generate(snap, good_llm)
    assert out["ok"] and not out["fallback"], label
    assert out["response"]["mistakeType"] == expected_mt, (label, out["response"]["mistakeType"])
    assert out["schemaValidated"] is True
    print(f"PASS scenario={label} mistakeType={expected_mt}")

# ── LLM failure -> Pattern Tutor fallback ───────────────────────────
def always_fail(_attempt, _snap):
    return {"ok": False, "error": "missing_api_key"}


fail_out = simulate_generate(wrong_q, always_fail, max_retries=2)
assert fail_out["fallback"] is True
assert fail_out["source"] == "pattern_tutor"
assert fail_out["attempts"] == 3
assert fail_out["response"]["title"]
print("PASS LLM failure -> Pattern Tutor fallback")

# ── Schema invalid then recover ─────────────────────────────────────
def invalid_then_ok(attempt, snap):
    if attempt < 2:
        return {"ok": True, "json": {"title": "broken"}}
    return {"ok": True, "json": rule_fallback(snap)}


recover = simulate_generate(calc_q, invalid_then_ok, max_retries=2)
assert recover["fallback"] is False
assert recover["attempts"] == 3
print("PASS schema retry then success")

# ── Schema always invalid -> fallback ───────────────────────────────
def always_invalid(_attempt, _snap):
    return {"ok": True, "json": {"title": "nope"}}


invalid_out = simulate_generate(concept_q, always_invalid, max_retries=2)
assert invalid_out["fallback"] is True
assert "missing:" in (invalid_out["error"] or "")
print("PASS schema validation -> fallback")

# ── Rule coach mistake types ────────────────────────────────────────
assert rule_fallback(calc_q)["mistakeType"] == "CALCULATION"
assert rule_fallback(concept_q)["mistakeType"] == "CONCEPT"
assert rule_fallback(memo_q)["mistakeType"] == "MEMORIZATION"
assert "정답" in rule_fallback(correct_q)["summary"]
assert "오답" in rule_fallback(wrong_q)["summary"]
print("PASS Rule Coach correct/wrong/mistake types")

print("ALL PASS - Sprint-11C Question Tutor")
