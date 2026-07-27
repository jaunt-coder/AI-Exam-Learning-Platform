# -*- coding: utf-8 -*-
"""Sprint-13A — Student Learning Workspace tests."""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Frozen DB files must remain untouched.
FROZEN = {
    "data/question-db.json": "93ef67ba4a725d6623134421eaf7ef8234269ded5906b2c7b8cadb823f9d8f3a",
    "data/question-db-mvp.json": "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20",
    "data/pattern-db.json": "f730f22ba33a44bfa1c7eb6c04eadcec2a0f255bbc9ee73fa9b8c19a9479aeed",
    "data/statistics.json": "37294c06391c795cd9289ec197826a13ea33e885db11af0cca469129a21dba4e",
}

for rel, expected in FROZEN.items():
    p = ROOT / rel
    assert p.exists(), rel
    got = hashlib.sha256(p.read_bytes()).hexdigest()
    assert got == expected, f"{rel} sha mismatch"

required = [
    "js/student/student-resolver.js",
    "js/student/student-storage.js",
    "js/student/student-session.js",
    "js/student/student-workspace.js",
    "js/question.js",
    "js/pattern.js",
    "js/exam.js",
    "js/ai-tutor.js",
    "js/learning-dashboard-page.js",
]
for rel in required:
    assert (ROOT / rel).exists(), rel

storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
assert "learning.student-session.v1" in storage
assert "learning.student-cache.v1" in storage

loader = (ROOT / "js/data-loader.js").read_text(encoding="utf-8")
for key in (
    "studentResolverContract",
    "studentWorkspaceContract",
    "studentSessionContract",
    "studentWorkspace:",
):
    assert key in loader, key

resolver = (ROOT / "js/student/student-resolver.js").read_text(encoding="utf-8")
for key in ("questionResolver", "patternResolver", "tableResolver", "solutionResolver"):
    assert key in resolver, key
assert "resolveQuestion(" in resolver
assert "toStudentQuestion" in resolver

question_ui = (ROOT / "js/question.js").read_text(encoding="utf-8")
assert "studentQuestionForDisplay" in question_ui
assert "review-badge-host" in question_ui
assert "badgeHost" in question_ui

pattern_ui = (ROOT / "js/pattern.js").read_text(encoding="utf-8")
assert "resolveQuestionsForPattern" in pattern_ui
assert "questionResolver(" in pattern_ui

exam_ui = (ROOT / "js/exam.js").read_text(encoding="utf-8")
assert "createExamResolvedSnapshot" in exam_ui
assert "getExamSnapshotQuestion" in exam_ui
assert "compareExamSnapshotWithLatest" in exam_ui

tutor_ui = (ROOT / "js/ai-tutor.js").read_text(encoding="utf-8")
assert "questionResolver" in tutor_ui
assert "resolveForTutor" in tutor_ui

dash_ui = (ROOT / "js/learning-dashboard-page.js").read_text(encoding="utf-8")
assert "enrichDashboardWithResolved" in dash_ui

# Runtime files must not import student workspace changes directly.
for frozen_runtime in (
    "runtime/learning-loop.js",
    "js/coach/ai-coach-service.js",
    "js/exam-engine.js",
):
    text = (ROOT / frozen_runtime).read_text(encoding="utf-8")
    assert "student-workspace" not in text
    assert "student-resolver" not in text

print("PASS DB unchanged / runtime unchanged / resolver auto-apply / exam snapshot / student screens")
print("ALL PASS - Sprint-13A Student Learning Workspace")
