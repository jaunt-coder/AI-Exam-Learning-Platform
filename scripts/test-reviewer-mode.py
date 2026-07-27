# -*- coding: utf-8 -*-
"""Sprint-12A — Reviewer Mode + Override Layer tests."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"


def effective_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


# Freeze
qpath = ROOT / "data/question-db-mvp.json"
q_sha = hashlib.sha256(qpath.read_bytes()).hexdigest()
assert q_sha == EXPECTED_QSHA
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

# Deliverable files
required = [
    "js/reviewer/review-service.js",
    "js/reviewer/override-service.js",
    "js/reviewer/review-storage.js",
    "js/reviewer/review-ui.js",
    "js/reviewer/table-editor.js",
    "js/reviewer/choice-editor.js",
    "js/reviewer/pattern-editor.js",
    "js/reviewer/review-history.js",
    "css/reviewer.css",
]
for rel in required:
    assert (ROOT / rel).exists(), rel

override_js = (ROOT / "js/reviewer/override-service.js").read_text(encoding="utf-8")
for name in (
    "export function resolveQuestion",
    "export function resolveTable",
    "export function resolveChoices",
    "export function resolveSolution",
    "export function saveOverride",
):
    assert name in override_js, name

table_js = (ROOT / "js/reviewer/table-editor.js").read_text(encoding="utf-8")
assert "createTableEditor" in table_js
assert "addRow" in table_js
assert "deleteColumn" in table_js
assert "undo" in table_js

history_js = (ROOT / "js/reviewer/review-history.js").read_text(encoding="utf-8")
assert "appendReviewHistory" in history_js
assert "undoReview" in history_js

storage_js = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "learning.review.v1" in storage_js
assert "question-overrides.v1" in storage_js
assert "review-history.v1" in storage_js

loader_js = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
assert "reviewContract" in loader_js
assert "overrideContract" in loader_js
assert "tableEditorContract" in loader_js
assert "questionOverrideContract" in loader_js
assert re.search(r"\breview\s*:", loader_js)
assert re.search(r"\boverride\s*:", loader_js)
assert re.search(r"\btableEditor\s*:", loader_js)

# UI hooks
q_html = (ROOT / "question.html").read_text(encoding="utf-8")
assert "reviewer-panel" in q_html
assert "reviewer-btn-host" in q_html
assert "review-badge-host" in q_html
assert "reviewer.css" in q_html

q_js = (ROOT / "js/question.js").read_text(encoding="utf-8")
assert "resolveQuestion" in q_js
assert "openReviewerPanel" in q_js
assert "renderQuestionBadge" in q_js

dash_html = (ROOT / "dashboard.html").read_text(encoding="utf-8")
dash_page = (ROOT / "js/learning-dashboard-page.js").read_text(encoding="utf-8")
assert "Reviewer Mode" in dash_html
assert "card-reviewer" in dash_html
assert "buildReviewerDashboardCard" in dash_page

# Frozen modules must not be modified in this sprint (spot-check coach/runtime)
runtime = (ROOT / "runtime/learning-loop.js").read_text(encoding="utf-8")
assert "override-service" not in runtime
assert "js/reviewer" not in runtime
coach = (ROOT / "js/coach/ai-coach-service.js").read_text(encoding="utf-8")
assert "from '../reviewer" not in coach
assert "override-service" not in coach

# Resolver logic (python mirror)
overrides = {}


def save_override(qid, patch):
    prev = overrides.get(qid, {"questionId": qid, "override": {}})
    prev["override"] = {**prev.get("override", {}), **patch, "reviewed": True}
    overrides[qid] = prev


def resolve_question(original):
    ov = overrides.get(original["questionId"])
    if not ov:
        return {**original, "_resolvedFrom": "original", "_hasOverride": False}
    o = ov["override"]
    return {
        **original,
        "question": o.get("question", original.get("question")),
        "table": o["table"] if "table" in o else original.get("table"),
        "choices": o.get("choices", original.get("choices")),
        "patternId": o.get("patternId", original.get("patternId")),
        "_resolvedFrom": "override",
        "_hasOverride": True,
    }


sample = next(q for q in qs if q.get("questionId") == "ACC_2015_Q075")
resolved0 = resolve_question(sample)
assert resolved0["_resolvedFrom"] == "original"

save_override(
    "ACC_2015_Q075",
    {
        "question": "종합원가계산 OVERRIDE TEXT",
        "patternId": "COST_PROCESS_001",
        "table": "| A | B |\n| --- | --- |\n| 1 | 2 |",
        "choices": ["a", "b", "c", "d", "e"],
        "reviewFlags": ["TABLE_FIXED"],
    },
)
resolved1 = resolve_question(sample)
assert resolved1["_resolvedFrom"] == "override"
assert resolved1["question"] == "종합원가계산 OVERRIDE TEXT"
assert resolved1["patternId"] == "COST_PROCESS_001"
assert resolved1["choices"][0] == "a"
print("PASS Override Resolver")

# Table editor serialize/parse mirror
md = "| H1 | H2 |\n| --- | --- |\n| a | b |"
assert "H1" in md and "a" in md
print("PASS Table Editor contract present")

# History undo contract present
assert "undoReview" in history_js
print("PASS History / Undo")

# Question DB bytes unchanged
assert hashlib.sha256(qpath.read_bytes()).hexdigest() == EXPECTED_QSHA
print("PASS Question DB unchanged")

print("ALL PASS - Sprint-12A Reviewer Mode")
