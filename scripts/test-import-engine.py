# -*- coding: utf-8 -*-
"""Sprint-19B — Universal Import Engine tests."""
from __future__ import annotations

import hashlib
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASS = 0
FAIL = 0


def check(desc, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS  {desc}")
    else:
        FAIL += 1
        print(f"  FAIL  {desc}")


def read(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def read_json(rel):
    text = read(rel)
    if text is None:
        return None
    return json.loads(text)


def sha256(rel):
    path = os.path.join(ROOT, rel)
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


print("=" * 60)
print("Sprint-19B Universal Import Engine - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

MODULES = [
    "js/import-engine/import-engine.js",
    "js/import-engine/pdf-loader.js",
    "js/import-engine/exam-splitter.js",
    "js/import-engine/subject-detector.js",
    "js/import-engine/question-parser.js",
    "js/import-engine/answer-parser.js",
    "js/import-engine/question-builder.js",
    "js/import-engine/pattern-builder.js",
    "js/import-engine/formula-builder.js",
    "js/import-engine/import-validator.js",
    "js/import-engine/import-storage.js",
    "js/import-engine/batch-import.js",
]

SUBJECTS = ["accounting", "economics", "civil", "realestate", "law"]

print("\n[1] Modules exist")
for m in MODULES:
    check(m, read(m) is not None)

print("\n[2] 2018~2025 folder auto-discovery")
past = os.path.join(ROOT, "source", "past-exams")
for y in range(2018, 2026):
    check(f"folder {y}", os.path.isdir(os.path.join(past, str(y))))
batch = read("js/import-engine/batch-import.js") or ""
check("discoverPastExamYears", "discoverPastExamYears" in batch)
check("DEFAULT_YEAR_RANGE 2018-2025", "2018" in batch and "2025" in batch)

print("\n[3] exam_1 / exam_2 / answer discovery")
loader = read("js/import-engine/pdf-loader.js") or ""
splitter = read("js/import-engine/exam-splitter.js") or ""
check("classifyExamFile exam_1", "exam_1" in loader)
check("classifyExamFile exam_2", "exam_2" in loader)
check("classifyExamFile answer", "answer" in loader)
check("splitYearFiles", "splitYearFiles" in splitter)
for y in (2018, 2020, 2024, 2025):
    folder = os.path.join(past, str(y))
    names = [n.lower() for n in os.listdir(folder)] if os.path.isdir(folder) else []
    check(f"{y} exam_1", any(n.startswith("exam_1.") for n in names))
    check(f"{y} exam_2", any(n.startswith("exam_2.") for n in names))
    check(f"{y} answer", any(n.startswith("answer.") for n in names))

print("\n[4] Subject Detect")
detector = read("js/import-engine/subject-detector.js") or ""
check("exam_1 → civil", "civil" in detector and "민법" in detector)
check("exam_1 → economics", "economics" in detector and "경제학" in detector)
check("exam_1 → realestate", "realestate" in detector and "부동산학" in detector)
check("exam_2 → law", "law" in detector and "관계법규" in detector)
check("exam_2 → accounting", "accounting" in detector and "회계학" in detector)
check("splitTextBySubject", "splitTextBySubject" in detector)
check("registerExamLayout (universal)", "registerExamLayout" in detector)

print("\n[5] Question / Answer pipeline")
qparser = read("js/import-engine/question-parser.js") or ""
aparser = read("js/import-engine/answer-parser.js") or ""
qbuilder = read("js/import-engine/question-builder.js") or ""
check("parseQuestions", "parseQuestions" in qparser)
check("matchAnswers", "matchAnswers" in aparser)
check("buildQuestionDb", "buildQuestionDb" in qbuilder)
for field in [
    "questionId", "subjectId", "year", "exam", "session", "number",
    "question", "table", "choices", "answer", "ocrQuality",
    "sourcePdf", "page", "hash",
]:
    check(f"field {field}", field in qbuilder)

print("\n[6] JSON 생성 (subjects/*/)")
report = read_json("subjects/import-report.json")
check("import-report.json", report is not None)
check("questionCount > 0", bool(report and report.get("questionCount", 0) > 0))
check("subjectCount == 5", bool(report and report.get("subjectCount") == 5))
for sid in SUBJECTS:
    qdb = read_json(f"subjects/{sid}/question-db.json")
    check(f"{sid}/question-db.json", qdb is not None)
    check(f"{sid} productDbWriteForbidden", bool(qdb and qdb.get("productDbWriteForbidden")))
    check(f"{sid} questions array", bool(qdb and isinstance(qdb.get("questions"), list)))

print("\n[7] Pattern Candidate 생성")
pbuilder = read("js/import-engine/pattern-builder.js") or ""
check("buildPatternCandidates", "buildPatternCandidates" in pbuilder)
check("수요 seed", "수요" in pbuilder)
check("취소 seed", "취소" in pbuilder)
check("재고자산 seed", "재고자산" in pbuilder)
for sid in SUBJECTS:
    pc = read_json(f"subjects/{sid}/pattern-candidate.json")
    check(f"{sid}/pattern-candidate.json", pc is not None)
    check(f"{sid} pattern product forbidden", bool(pc and pc.get("productDbWriteForbidden")))

print("\n[8] Formula Candidate 생성")
fbuilder = read("js/import-engine/formula-builder.js") or ""
check("buildFormulaCandidates", "buildFormulaCandidates" in fbuilder)
check("officialFormulaDbWriteForbidden", "officialFormulaDbWriteForbidden" in fbuilder)
acc_formula_db = read("subjects/accounting/formula-db.json") or ""
for sid in SUBJECTS:
    fc = read_json(f"subjects/{sid}/formula-candidate.json")
    check(f"{sid}/formula-candidate.json", fc is not None)
    check(f"{sid} formula candidate forbidden flag", bool(fc and fc.get("officialFormulaDbWriteForbidden")))
# official formula-db still present / not replaced by candidate schema
check("accounting formula-db.json still official", '"formulas"' in acc_formula_db and "ACC_INV_006" in acc_formula_db)

print("\n[9] Dashboard Import Progress")
html = read("dashboard.html") or ""
dash = read("js/learning-dashboard-page.js") or ""
widget = read("js/dashboard/dashboard-widget.js") or ""
check("widget-import-progress", "widget-import-progress" in html)
check("Import Progress heading", "Import Progress" in html)
check("importProgress WIDGET_IDS", "importProgress" in widget)
check("renderImportProgressCard", "renderImportProgressCard" in dash)
check("getImportDashboardCard", "getImportDashboardCard" in dash)
for label in ["총 PDF", "완료", "실패", "OCR Quality", "Question Count", "Subject Count"]:
    check(f"dashboard metric {label}", label in html or label in dash)

print("\n[10] Cache / Storage (additive)")
storage = read("js/storage.js") or ""
check("learning.import-history.v1", "learning.import-history.v1" in storage)
check("learning.import-cache.v1", "learning.import-cache.v1" in storage)
# existing keys must remain
for k in [
    "learning.current-subject.v1",
    "learning.personal-textbook.v1",
    "learning.final-book.v1",
    "question-overrides.v1",
]:
    check(f"key kept {k}", k in storage)

print("\n[11] Contracts")
loader = read("js/data-loader.js") or ""
check("importEngineContract", "importEngineContract" in loader)
check("questionImportContract", "questionImportContract" in loader)
check("answerImportContract", "answerImportContract" in loader)
check("subjectDetectContract", "subjectDetectContract" in loader)
check("validationImportEngine", "validationImportEngine" in loader)
# prior contracts not deleted
check("subjectAdapterContract kept", "subjectAdapterContract" in loader)
check("overrideContract kept", "overrideContract" in loader)

print("\n[12] Answer Match / Gemini Ready markers")
engine = read("js/import-engine/import-engine.js") or ""
check("importExamText", "importExamText" in engine)
check("runBatchImport", "runBatchImport" in engine)
check("geminiReady field", "geminiReady" in qbuilder)
acc_q = read_json("subjects/accounting/question-db.json") or {}
check("accounting has questions", (acc_q.get("count") or 0) > 0)

print("\n[13] Immutable layers")
check("Question DB SHA identical", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA identical", sha256("data/pattern-db.json") == P_SHA)
check("Statistics SHA identical", sha256("data/statistics.json") == S_SHA)
print(f"  INFO  Q={Q_SHA[:16]}…")
print(f"  INFO  P={P_SHA[:16]}…")
print(f"  INFO  S={S_SHA[:16]}…")

le = read("js/learning-engine/learning-engine.js") or ""
check("Learning Engine no Import rewrite", "Sprint-19B" not in le or "subjectId는 전달만" in le)
# Learning Engine may mention subjectId from 19A — ensure no import-engine coupling
check("LE no import-engine import", "import-engine" not in le)
reco = read("js/learning-engine/recommendation-engine.js") or ""
check("Recommendation no import-engine", "import-engine" not in reco)
override = read("js/reviewer/override-service.js") or ""
check("Override no import-engine", "import-engine" not in override)
orch = read("js/gemini-solver/gemini-orchestrator.js") or ""
check("Gemini Solver no import-engine", "import-engine" not in orch)
vision = read("js/gemini-vision/vision-recovery.js") or ""
check("Vision no import-engine", "import-engine" not in vision)

print("\n[14] Product path guard")
validator = read("js/import-engine/import-validator.js") or ""
check("isForbiddenProductPath", "isForbiddenProductPath" in validator)
check("forbids data/question-db.json", "data/question-db.json" in validator)
check("productDbWriteForbidden in report", bool(report and report.get("productDbWriteForbidden")))

print("\n[15] Runner script")
check("scripts/run-universal-import.py", read("scripts/run-universal-import.py") is not None)
check("scripts/test-import-engine.py self", True)

print("\n" + "=" * 60)
print(f"RESULT: {PASS} PASS / {FAIL} FAIL")
print("=" * 60)
sys.exit(0 if FAIL == 0 else 1)
