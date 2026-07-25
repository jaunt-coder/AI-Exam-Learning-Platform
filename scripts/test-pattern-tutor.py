# -*- coding: utf-8 -*-
"""Sprint-11B — Pattern Tutor AI Coach tests."""
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
    "whyWrong",
    "patternExplanation",
    "commonMistakes",
    "reviewChecklist",
    "nextStudy",
    "confidence",
]


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


def validate_response(value):
    errors = []
    if not isinstance(value, dict):
        return False, ["response_not_object"], None
    for key in RESPONSE_KEYS:
        if key not in value or value[key] is None:
            errors.append(f"missing:{key}")
    if errors:
        return False, errors, None
    common = value["commonMistakes"]
    checklist = value["reviewChecklist"]
    if not isinstance(common, list):
        common = [str(common)]
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
        "whyWrong": str(value["whyWrong"]),
        "patternExplanation": str(value["patternExplanation"]),
        "commonMistakes": [str(x) for x in common],
        "reviewChecklist": [str(x) for x in checklist],
        "nextStudy": str(value["nextStudy"]),
        "confidence": conf,
    }
    return True, [], data


def rule_fallback(snapshot):
    pattern = (snapshot.get("pattern") or {}).get("patternId") or "UNKNOWN"
    mastery = (snapshot.get("mastery") or {}).get("masteryLevel") or "UNKNOWN"
    weakness = (snapshot.get("weakness") or {}).get("weaknessType") or "NONE"
    reco = (snapshot.get("recommendation") or {}).get("strategyType") or "NONE"
    reason = (snapshot.get("recommendation") or {}).get("reason") or "Runtime Recommendation"
    return {
        "title": f"{pattern} Pattern Tutor",
        "summary": f"{pattern} Pattern을 Mastery({mastery})와 Weakness({weakness})를 기준으로 복습하세요. Recommendation({reco})을 그대로 따릅니다.",
        "whyWrong": f"이 Pattern에서 자주 틀리는 이유는 Weakness 신호({weakness})와 최근 시도 결과입니다.",
        "patternExplanation": f"{pattern}는 Pattern 중심 학습 대상입니다. Recommendation({reco}: {reason})을 유지하세요.",
        "commonMistakes": [
            "정답만 확인하고 Pattern 구조를 건너뛰는 경우",
            f"Weakness({weakness}) 신호를 무시하는 경우",
        ],
        "reviewChecklist": [
            f"{pattern} Pattern 핵심 개념 복기",
            f"Recommendation({reco})에 맞는 문제만 복습",
        ],
        "nextStudy": f"다음 학습: {pattern} Pattern을 Recommendation 전략대로 복습하세요.",
        "confidence": 0.55,
    }


def simulate_generate(snapshot, llm_factory, max_retries=2):
    """Mirror generatePatternTutor retry + fallback behavior."""
    last_error = None
    attempts = 0
    for attempt in range(max_retries + 1):
        attempts = attempt + 1
        result = llm_factory(attempt, snapshot)
        if not result.get("ok"):
            last_error = result.get("error") or "llm_failed"
            continue
        parsed = result.get("json")
        ok, errors, data = validate_response(parsed)
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
        }
    fb = rule_fallback(snapshot)
    return {
        "ok": True,
        "fallback": True,
        "source": "rule_coach",
        "attempts": attempts,
        "response": fb,
        "error": last_error,
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

# ── Deliverables exist ──────────────────────────────────────────────
tutor_js = (ROOT / "js/coach/pattern-tutor.js").read_text(encoding="utf-8")
prompt_js = (ROOT / "js/llm/pattern-prompt-builder.js").read_text(encoding="utf-8")
loader_js = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
dash_html = (ROOT / "dashboard.html").read_text(encoding="utf-8")
dash_page = (ROOT / "js/learning-dashboard-page.js").read_text(encoding="utf-8")
assert "export async function generatePatternTutor" in tutor_js
assert "export function buildPatternTutorPrompt" in prompt_js
assert "role: 'system'" in prompt_js or 'role: "system"' in prompt_js
assert "role: 'developer'" in prompt_js or 'role: "developer"' in prompt_js
assert "role: 'user'" in prompt_js or 'role: "user"' in prompt_js
assert "감정평가사 회계학 전문 튜터" in prompt_js
assert "PATTERN_TUTOR_TEMPERATURE = 0.2" in tutor_js
assert "PATTERN_TUTOR_MAX_RETRIES = 2" in tutor_js
assert "buildPatternTutorRuleFallback" in tutor_js
assert "card-pattern-tutor" in dash_html
assert "AI Pattern Tutor" in dash_html
assert "buildPatternTutorDashboardCard" in dash_page
assert (ROOT / "docs/sprint-11B-pattern-tutor.md").exists()
assert (ROOT / "docs/sprint-11B-report.md").exists()

# ── validation.patternTutor ─────────────────────────────────────────
assert re.search(r"patternTutor\s*:", loader_js)
assert '"provider": \'openai\'' in loader_js or "provider: 'openai'" in loader_js
assert "model: 'gpt-5.5'" in loader_js
assert "fallback: true" in loader_js
assert "connected: true" in loader_js

# ── Storage read-only (no setItem for learning.* in tutor) ──────────
assert "setItem(" not in tutor_js
assert "LEARNING_MASTERY_V1" in tutor_js
assert "LEARNING_WEAKNESS_V1" in tutor_js
assert "LEARNING_RECOMMENDATION_V1" in tutor_js

# ── Runtime / Adapter reuse ─────────────────────────────────────────
assert "createLlmClient" in tutor_js
assert "from '../llm/llm-client.js'" in tutor_js
runtime = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "pattern-tutor" not in runtime
assert "generatePatternTutor" not in runtime

# ── Schema validation ───────────────────────────────────────────────
ok, errs, data = validate_response(
    {
        "title": "t",
        "summary": "s",
        "whyWrong": "w",
        "patternExplanation": "p",
        "commonMistakes": ["a"],
        "reviewChecklist": ["b"],
        "nextStudy": "n",
        "confidence": 0.8,
    }
)
assert ok and data["confidence"] == 0.8

ok_miss, errs_miss, _ = validate_response({"title": "only"})
assert not ok_miss and any(e.startswith("missing:") for e in errs_miss)

# ── Mastered / Learning / Retry snapshots ───────────────────────────
mastered = {
    "pattern": {"patternId": "ACC-COST-001"},
    "mastery": {"patternId": "ACC-COST-001", "masteryLevel": "MASTERED", "accuracy": 0.95},
    "weakness": {"patternId": "ACC-COST-001", "weaknessType": "NONE"},
    "recommendation": {
        "patternId": "ACC-COST-001",
        "strategyType": "MAINTAIN",
        "reasonCode": "MASTERED_STABLE",
        "reason": "숙련 유지",
    },
}
learning = {
    "pattern": {"patternId": "ACC-INV-001"},
    "mastery": {"patternId": "ACC-INV-001", "masteryLevel": "LEARNING", "accuracy": 0.45},
    "weakness": {"patternId": "ACC-INV-001", "weaknessType": "CONCEPT_ERROR"},
    "recommendation": {
        "patternId": "ACC-INV-001",
        "strategyType": "FOCUSED_DRILL",
        "reasonCode": "LOW_ACCURACY",
        "reason": "개념 보강",
    },
}
retry = {
    "pattern": {"patternId": "ACC-INV-002"},
    "mastery": {"patternId": "ACC-INV-002", "masteryLevel": "RETRY_REQUIRED", "accuracy": 0.2},
    "weakness": {"patternId": "ACC-INV-002", "weaknessType": "REPEATED_MISS"},
    "recommendation": {
        "patternId": "ACC-INV-002",
        "strategyType": "RETRY",
        "reasonCode": "REPEATED_MISS",
        "reason": "재도전 필요",
    },
}


def good_llm(_attempt, snap):
    fb = rule_fallback(snap)
    fb["confidence"] = 0.9
    return {"ok": True, "json": fb}


for label, snap in (
    ("MASTERED", mastered),
    ("LEARNING", learning),
    ("RETRY", retry),
):
    out = simulate_generate(snap, good_llm)
    assert out["ok"] and not out["fallback"], label
    assert out["response"]["title"]
    assert snap["pattern"]["patternId"] in out["response"]["title"]
    print(f"PASS scenario={label} source=llm")

# ── LLM failure → fallback ─────────────────────────────────────────
def always_fail(_attempt, _snap):
    return {"ok": False, "error": "missing_api_key"}


fail_out = simulate_generate(learning, always_fail, max_retries=2)
assert fail_out["fallback"] is True
assert fail_out["source"] == "rule_coach"
assert fail_out["attempts"] == 3  # initial + 2 retries
assert fail_out["response"]["title"]
print("PASS LLM failure -> Rule Coach fallback")

# ── Schema invalid then recover on retry ────────────────────────────
def invalid_then_ok(attempt, snap):
    if attempt < 2:
        return {"ok": True, "json": {"title": "broken"}}
    fb = rule_fallback(snap)
    return {"ok": True, "json": fb}


recover = simulate_generate(retry, invalid_then_ok, max_retries=2)
assert recover["fallback"] is False
assert recover["attempts"] == 3
print("PASS schema validation retry then success")

# ── Schema invalid always → fallback ────────────────────────────────
def always_invalid(_attempt, _snap):
    return {"ok": True, "json": {"title": "nope"}}


invalid_out = simulate_generate(mastered, always_invalid, max_retries=2)
assert invalid_out["fallback"] is True
assert "missing:" in (invalid_out["error"] or "")
print("PASS schema validation -> fallback")

# ── Fallback uses recommendation ────────────────────────────────────
fb = rule_fallback(learning)
assert "FOCUSED_DRILL" in fb["summary"] or "FOCUSED_DRILL" in fb["patternExplanation"]
assert "ACC-INV-001" in fb["title"]
print("PASS fallback uses recommendation")

print("ALL PASS - Sprint-11B Pattern Tutor")
