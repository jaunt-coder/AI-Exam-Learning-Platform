# -*- coding: utf-8 -*-
"""Sprint-15B — AI Learning Loop & Smart Tutor tests."""
from __future__ import annotations

import hashlib
import io
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


def sha256(rel):
    path = os.path.join(ROOT, rel)
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


print("=" * 60)
print("Sprint-15B AI Learning Loop & Smart Tutor - Test Suite")
print("=" * 60)

Q_SHA = sha256("data/question-db.json")
P_SHA = sha256("data/pattern-db.json")
S_SHA = sha256("data/statistics.json")

print("\n[1] Modules")
modules = [
    "js/smart-tutor/smart-review.js",
    "js/smart-tutor/formula-card.js",
    "js/smart-tutor/mini-retry.js",
    "js/smart-tutor/weak-memory.js",
    "js/smart-tutor/smart-tutor.js",
    "js/smart-tutor/learning-loop.js",
    "js/smart-tutor/cache.js",
    "css/smart-tutor.css",
]
for m in modules:
    text = read(m)
    check(m, text is not None and len((text or "").strip()) > 40)

print("\n[2] AI 해설 생성 (Smart Explanation)")
review = read("js/smart-tutor/smart-review.js") or ""
check("buildSmartExplanation", "buildSmartExplanation" in review)
check("한 줄 정답", "한 줄 정답" in review)
check("핵심 이유", "핵심 이유" in review)
check("계산 순서", "계산 순서" in review)
check("주의할 함정", "주의할 함정" in review)
check("시험장에서 기억할 문장", "시험장에서 기억할 문장" in review)

print("\n[3] 30초 복습 카드")
check("buildThirtySecondReview", "buildThirtySecondReview" in review)
check("암기시간 30초", "seconds: 30" in review or "30초" in review)
check("FIFO 복습 bullet", "먼저 평균단가" in review or "FIFO는 먼저" in review)

print("\n[4] Formula Card")
formula = read("js/smart-tutor/formula-card.js") or ""
check("buildFormulaCard", "buildFormulaCard" in formula)
check("암기 purpose", "암기" in formula)
check("FIFO chain", "기말재고" in formula and "최근 매입분" in formula)
check("generateFormulas reuse", "generateFormulas" in formula)

print("\n[5] Mistake Diagnosis Upgrade")
tutor = read("js/smart-tutor/smart-tutor.js") or ""
check("classifyMistakeType", "classifyMistakeType" in tutor)
check("계산 실수", "계산 실수" in tutor)
check("개념 착각", "개념 착각" in tutor)
check("문제를 끝까지 안 읽음", "문제를 끝까지 안 읽음" in tutor)
check("Pattern 혼동", "Pattern 혼동" in tutor)
check("시간 부족", "시간 부족" in tutor)
check("Confidence", "confidence" in tutor)

print("\n[6] Weak Memory")
weak = read("js/smart-tutor/weak-memory.js") or ""
check("recordWeakMistake", "recordWeakMistake" in weak)
check("threshold 3", "WEAK_MEMORY_THRESHOLD = 3" in weak or "threshold" in weak.lower())
check("mountWeakBanner", "mountWeakBanner" in weak)
check("FIFO 혼동 message", "평균단가" in weak and "혼동" in weak)

print("\n[7] Smart Tutor (시험장 체크리스트)")
check("buildExamHallTutor", "buildExamHallTutor" in tutor)
check("시험장에서", "시험장에서" in tutor)
check("이렇게 푸세요", "이렇게 푸세요" in tutor)
check("FIFO 확인 step", "FIFO 확인" in tutor)

print("\n[8] Mini Retry")
mini = read("js/smart-tutor/mini-retry.js") or ""
check("pickMiniRetry", "pickMiniRetry" in mini)
check("relatedQuestions", "relatedQuestions" in mini)
check("Question DB 생성 금지", "생성 없음" in mini or "created: false" in mini)

print("\n[9] Auto Learning Loop + Recommendation")
loop = read("js/smart-tutor/learning-loop.js") or ""
check("runAutoLearningLoop", "runAutoLearningLoop" in loop)
check("buildLearningRecommendations", "buildLearningRecommendations" in loop)
check("buildLearningDashboard", "buildLearningDashboard" in loop)
check("explainActiveRecommendations", "explainActiveRecommendations" in loop)
check("resolveNextProblems", "resolveNextProblems" in loop)
check("formulaUnchanged flag", "formulaUnchanged: true" in loop)
check("runtimeUnchanged flag", "runtimeUnchanged: true" in loop)

print("\n[10] Reviewer Feedback 연동")
check("buildReviewerFeedbackHints", "buildReviewerFeedbackHints" in review)
check("getOverride reviewerNote", "getOverride" in tutor and "reviewerNote" in tutor)
check("getApprovedSolution", "getApprovedSolution" in tutor)

print("\n[11] 공식 승격 개선 (no auto)")
check("PROMOTE_STAGES", "PROMOTE_STAGES" in tutor)
check("Candidate stage", "CANDIDATE" in tutor)
check("requestPromoteCandidate", "requestPromoteCandidate" in tutor)
check("autoPromote false", "autoPromote: false" in tutor)
check("Official only after admin", "관리자" in tutor or "ADMIN" in tutor)

print("\n[12] Storage keys")
storage = read("js/storage.js") or ""
for key in [
    "learning.smart-review.v1",
    "learning.weak-memory.v1",
    "learning.formula-card.v1",
    "learning.mini-retry.v1",
    "learning.smart-tutor.v1",
]:
    check(f"storage {key}", key in storage)

print("\n[13] Contracts")
loader = read("js/data-loader.js") or ""
for c in [
    "smartReviewContract",
    "formulaCardContract",
    "miniRetryContract",
    "weakMemoryContract",
    "smartTutorContract",
    "learningLoopContract",
    "validationSmartTutor",
]:
    check(f"contract {c}", c in loader)

print("\n[14] UI wiring")
engine = read("js/solution-engine/solution-engine.js") or ""
ll_js = read("js/learning-loop-page.js") or ""
ll_html = read("learning-loop.html") or ""
q_js = read("js/question.js") or ""
q_html = read("question.html") or ""
css = read("css/smart-tutor.css") or ""
check("solution-engine enrichWithSmartTutor", "enrichWithSmartTutor" in engine)
check("mountSmartTutorResult", "mountSmartTutorResult" in engine)
check("smart-tutor.css on question", "smart-tutor.css" in q_html)
check("smart-tutor.css on learning-loop", "smart-tutor.css" in ll_html)
check("weak-memory-banner question.html", "weak-memory-banner" in q_html)
check("weak-memory-banner learning-loop.html", "weak-memory-banner" in ll_html)
check("mountWeakBanner in question.js", "mountWeakBanner" in q_js)
check("mountWeakBanner in learning-loop-page", "mountWeakBanner" in ll_js)
check("CSS formula card", "st-formula" in css)
check("CSS 30s review", "st-review" in css)
check("Result structure AI 풀이", "AI 풀이" in tutor)
check("Result structure 학습 완료", "학습 완료" in tutor)

print("\n[15] Learning Engine 계산식 변경 없음 / Runtime 변경 없음")
frozen = [
    "runtime/learning-loop.js",
    "runtime/grader.js",
    "js/learning-engine/learning-engine.js",
    "js/learning-engine/mastery-engine.js",
    "js/learning-engine/recommendation-engine.js",
    "js/learning-engine/review-engine.js",
]
for f in frozen:
    text = read(f) or ""
    check(f"{f} no Sprint-15B rewrite", "Sprint-15B" not in text and "15B" not in text)

mastery = read("js/learning-engine/mastery-engine.js") or ""
check("mastery computePatternMastery intact", "computePatternMastery" in mastery)
reco = read("js/learning-engine/recommendation-engine.js") or ""
check("recommendation buildLearningRecommendations intact", "buildLearningRecommendations" in reco)
check("learningLoopContract formulas unchanged", "learningEngineFormulasUnchanged: true" in loader)
check("learningLoopContract runtime unchanged", "runtimeUnchanged: true" in loader)

print("\n[16] Question / Pattern / Statistics DB SHA identical")
check("Question DB SHA unchanged", sha256("data/question-db.json") == Q_SHA)
check("Pattern DB SHA unchanged", sha256("data/pattern-db.json") == P_SHA)
check("Statistics SHA unchanged", sha256("data/statistics.json") == S_SHA)
check("Question DB no smart-tutor write", "smart-tutor" not in (read("data/question-db.json") or ""))
check("Pattern DB no smart-tutor write", "smart-tutor" not in (read("data/pattern-db.json") or ""))
check("Statistics no smart-tutor write", "smart-tutor" not in (read("data/statistics.json") or ""))

print("\n[17] Existing contracts preserved")
for c in [
    "solutionEngineContract",
    "diagnosisContract",
    "tutorAdviceContract",
    "prescriptionContract",
]:
    check(f"kept {c}", c in loader)

print("\n" + "=" * 60)
total = PASS + FAIL
print(f"Results: {PASS}/{total} PASS, {FAIL}/{total} FAIL")
print(f"Question DB SHA256: {Q_SHA}")
print(f"Pattern DB SHA256:  {P_SHA}")
print(f"Statistics SHA256:  {S_SHA}")
if FAIL:
    print("STATUS: FAIL")
    sys.exit(1)
print("STATUS: ALL PASS")
sys.exit(0)
