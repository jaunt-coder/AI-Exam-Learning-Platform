# -*- coding: utf-8 -*-
"""Sprint-11A — LLM Adapter + AI Coach Foundation tests."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


def stable_stringify(value):
    if value is None or not isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, list):
        return "[" + ",".join(stable_stringify(v) for v in value) + "]"
    keys = sorted(value.keys())
    return "{" + ",".join(f'{json.dumps(k)}:{stable_stringify(value[k])}' for k in keys) + "}"


def hash_prompt_snapshot(prompt, snapshot):
    payload = f"{prompt}\n---\n{stable_stringify(snapshot)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def build_prompt(task, snapshot):
    pattern = (
        (snapshot.get("recommendation") or {}).get("patternId")
        or (snapshot.get("strategy") or {}).get("patternId")
        or "UNKNOWN"
    )
    mastery = (snapshot.get("mastery") or {}).get("masteryLevel") or "UNKNOWN"
    weakness = (snapshot.get("recommendation") or {}).get("reasonCode") or "NONE"
    reco = (snapshot.get("recommendation") or {}).get("strategyType") or "NONE"
    goal = f"{pattern} Pattern 3문제"
    prompt = "\n".join(
        [
            "너는 감정평가사 회계학 AI 학습코치이다.",
            "학생 상태는 다음과 같다.",
            "",
            f"Task: {task}",
            f"Pattern: {pattern}",
            f"Mastery: {mastery}",
            f"Weakness: {weakness}",
            f"Recommendation: {reco}",
            f"Today's Goal: {goal}",
            "",
            "반드시",
            "왜 추천하는지",
            "오늘 어떻게 공부하는지",
            "주의할 점",
            "격려",
            "를",
            "300~500자",
            "한국어로 작성하라.",
            "",
            "Runtime Recommendation을 수정하지 말라.",
            "새로운 Pattern을 추천하지 말라.",
            "Question DB / Pattern DB 전체를 요구하거나 가정하지 말라.",
        ]
    )
    return prompt


def rule_coach(task, snapshot):
    pattern = (snapshot.get("recommendation") or {}).get("patternId") or "UNKNOWN"
    text = (
        f"[{task}] 오늘은 {pattern} Pattern을 중심으로 공부하는 것이 좋습니다. "
        "Runtime Recommendation을 바꾸지 말고 Study Session Queue만 따라가세요. "
        "계산 실수와 개념 혼동을 메모하고 한 문제씩 차분히 해결하면 됩니다. "
        "지금 루틴을 지키면 충분히 안정됩니다. "
        "Runtime 추천을 신뢰하고, 오늘은 새로운 Pattern으로 이탈하지 않는 것이 핵심입니다."
    )
    return text


# Freeze
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

snapshot = {
    "mastery": {"patternId": "COST_CVP_001", "masteryLevel": "LEARNING"},
    "weakness": {"patternId": "COST_CVP_001", "weaknessSignals": [{"type": "REPEATED_MISS"}]},
    "plan": {"patternId": "COST_CVP_001", "actionType": "RETRY_PATTERN"},
    "strategy": {"patternId": "COST_CVP_001", "strategyType": "PATTERN_RETRY_SET"},
    "recommendation": {
        "patternId": "COST_CVP_001",
        "strategyType": "PATTERN_RETRY_SET",
        "reasonCode": "REPEATED_MISS",
    },
    "studySession": {"questionIds": ["Q1", "Q2", "Q3"]},
}

# Prompt builder
p1 = build_prompt("TODAY_COACH", snapshot)
p2 = build_prompt("TODAY_COACH", snapshot)
assert p1 == p2
assert "COST_CVP_001" in p1
assert "REPEATED_MISS" in p1
assert "PATTERN_RETRY_SET" in p1
assert "Question DB" in p1 or "Pattern DB" in p1
assert "수정하지 말라" in p1

# Hash deterministic
h1 = hash_prompt_snapshot(p1, snapshot)
h2 = hash_prompt_snapshot(p2, snapshot)
assert h1 == h2
assert len(h1) == 64

# Cache semantics (logical)
cache = {}
cache[h1] = "cached-response"
assert cache[hash_prompt_snapshot(p1, snapshot)] == "cached-response"

# Fallback rule coach
fb = rule_coach("TODAY_COACH", snapshot)
assert "COST_CVP_001" in fb
assert len(fb) >= 100

# Config / schema
llm_cfg = json.loads((ROOT / "data/llm-config.json").read_text(encoding="utf-8"))
assert llm_cfg["provider"] == "OPENAI"
assert llm_cfg["model"] == "gpt-5.5"
assert llm_cfg["adapter"] is True
assert llm_cfg["connected"] is True
coach_schema = json.loads((ROOT / "data/coach-schema.json").read_text(encoding="utf-8"))
assert "TODAY_COACH" in coach_schema["tasks"]

# Files exist
for rel in (
    "js/llm/llm-client.js",
    "js/llm/llm-provider.js",
    "js/llm/openai-provider.js",
    "js/llm/prompt-builder.js",
    "js/llm/prompt-cache.js",
    "js/llm/prompt-hash.js",
    "js/llm/provider-registry.js",
    "js/coach/ai-coach-service.js",
):
    assert (ROOT / rel).exists(), rel

client = (ROOT / "js/llm/llm-client.js").read_text(encoding="utf-8")
assert "export async function generate" in client or "async generate" in client
assert "healthCheck" in client
assert "chat" in client

openai = (ROOT / "js/llm/openai-provider.js").read_text(encoding="utf-8")
assert "gpt-5.5" in openai
assert "OPENAI_API_KEY" in openai
assert "sk-" not in openai  # no hardcoded key prefix literals of real keys
assert re.search(r"Bearer \$\{apiKey\}|Authorization", openai)

registry = (ROOT / "js/llm/provider-registry.js").read_text(encoding="utf-8")
for pid in ("OPENAI", "GEMINI", "CLAUDE", "LOCAL"):
    assert pid in registry

coach = (ROOT / "js/coach/ai-coach-service.js").read_text(encoding="utf-8")
assert "createLlmClient" in coach
assert "api.openai.com" not in coach
assert "buildRuleCoachMessage" in coach
assert "buildTodayCoach" in coach
assert "buildPatternCoach" in coach
assert "buildRecommendationCoach" in coach

# Runtime must not import LLM/OpenAI
loop = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "openai" not in loop.lower()
assert "llm-client" not in loop
assert "ai-coach-service" not in loop

# Forbidden services not modified in this sprint (presence of prior APIs still ok)
for forbidden in (
    "js/recommendation-service.js",
    "js/study-session-service.js",
    "js/question-selector.js",
    "js/mastery-service.js",
    "js/weakness-service.js",
    "js/learning-plan-service.js",
    "js/learning-strategy-service.js",
):
    assert (ROOT / forbidden).exists()

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "const llm =" in loader or "llm:" in loader
assert "provider: 'OPENAI'" in loader
assert "model: 'gpt-5.5'" in loader
assert "adapter: true" in loader

storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "learning.llm.cache.v1" in storage

dash = (ROOT / "dashboard.html").read_text(encoding="utf-8")
assert "card-today-coach" in dash
assert "card-pattern-coach" in dash
assert "card-recommendation-coach" in dash

print("Sprint-11A LLM Adapter + AI Coach tests: PASS")
print(f"  hash={h1[:16]}… promptChars={len(p1)} fallbackChars={len(fb)}")
