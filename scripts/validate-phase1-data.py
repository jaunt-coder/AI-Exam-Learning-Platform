#!/usr/bin/env python3
"""Phase 1 data validation (Python fallback when Node unavailable)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
passed = failed = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  PASS: {msg}")


def bad(msg):
    global failed
    failed += 1
    print(f"  FAIL: {msg}")


print("\n=== MVP Phase 1 Data Validation (Python) ===\n")

for rel in [
    "data/master-db.json",
    "data/pattern-db.json",
    "data/question-db.json",
    "data/statistics.json",
    "docs/exam-analysis.md",
    "docs/pattern-db.md",
    "docs/statistics.md",
    "source/past-exams/README.md",
]:
    if (ROOT / rel).exists():
        ok(rel)
    else:
        bad(f"Missing: {rel}")

master = json.loads((ROOT / "data/master-db.json").read_text(encoding="utf-8"))
patterns = json.loads((ROOT / "data/pattern-db.json").read_text(encoding="utf-8"))
questions = json.loads((ROOT / "data/question-db.json").read_text(encoding="utf-8"))
stats = json.loads((ROOT / "data/statistics.json").read_text(encoding="utf-8"))

if master.get("metadata", {}).get("pdfVerified") is True:
    ok("pdfVerified")
else:
    bad("pdfVerified")

if len(questions) == master["summary"]["totalQuestions"]:
    ok("master question count")
else:
    bad("master count")

if len(patterns) == master["summary"]["totalPatterns"]:
    ok("master pattern count")
else:
    bad("master patterns")

for p in patterns:
    cnt = sum(1 for q in questions if q["patternId"] == p["patternId"])
    if p["frequency"] == cnt:
        ok(f"freq {p['patternId']}={cnt}")
    else:
        bad(f"freq {p['patternId']} expected {p['frequency']} got {cnt}")
    linked = {q["questionId"] for q in questions if q["patternId"] == p["patternId"]}
    if set(p["relatedQuestions"]) == linked:
        ok(f"related {p['patternId']}")
    else:
        bad(f"related {p['patternId']}")

if len(stats) == len(patterns):
    ok("statistics count")
else:
    bad("statistics count")

for s in stats:
    p = next(x for x in patterns if x["patternId"] == s["patternId"])
    if s["totalCount"] == p["frequency"]:
        ok(f"stat {s['patternId']}")
    else:
        bad(f"stat {s['patternId']}")

for q in questions:
    if q.get("originalQuestion"):
        ok(f"{q['questionId']}.originalQuestion")
    else:
        bad(f"{q['questionId']} no originalQuestion")
    if q["source"].get("type") == "past_exam":
        ok(f"{q['questionId']}.past_exam")
    else:
        bad(f"{q['questionId']} source.type")
    if q["source"].get("page"):
        ok(f"{q['questionId']}.page")
    else:
        bad(f"{q['questionId']} no page")
    if q["source"].get("year") == q["year"]:
        ok(f"{q['questionId']}.year")
    else:
        bad(f"{q['questionId']} year mismatch")
    if len(q.get("choices", [])) >= 4:
        ok(f"{q['questionId']}.choices")
    else:
        bad(f"{q['questionId']} choices")
    if q.get("answer"):
        ok(f"{q['questionId']}.answer")
    else:
        bad(f"{q['questionId']} answer")

print(f"\n=== Result: {passed} passed, {failed} failed ===\n")
raise SystemExit(1 if failed else 0)
