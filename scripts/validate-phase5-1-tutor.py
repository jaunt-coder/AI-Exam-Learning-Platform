#!/usr/bin/env python3
"""Phase 5.1 AI Tutor Quality Enhancement validation (read-only DB)."""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TARGET_PATTERNS = [
    "ACC_INV_001",
    "ACC_INV_003",
    "ACC_INV_004",
    "ACC_INV_005",
    "ACC_INV_006",
    "ACC_INV_007",
]

PATTERN_MISMATCH_IDS = {"ACC_INV_Q011", "ACC_INV_Q012"}

THRESHOLDS = {
    "resolvable_rate": 0.80,
    "calc_resolvable_rate": 0.90,
    "wrong_analysis_rate": 0.90,
}


def load_overrides():
    data_path = ROOT / "scripts" / "tutor-overrides-data.json"
    if data_path.exists():
        return json.loads(data_path.read_text(encoding="utf-8"))
    # fallback: parse generated JS export
    js = (ROOT / "js" / "ai-tutor-content" / "question-overrides.js").read_text(encoding="utf-8")
    m = re.search(r"export const QUESTION_OVERRIDES = (\{[\s\S]*?\n\};)", js)
    assert m, "QUESTION_OVERRIDES not found"
    raw = m.group(1).rstrip(";")
    raw = re.sub(r"(\w+):", r'"\1":', raw)
    raw = raw.replace("'", '"')
    return json.loads(raw)


def is_calculation(q, override):
    if override:
        return override.get("questionType") == "calculation"
    stem = (q.get("question", "") + " " + q.get("originalQuestion", "")).lower()
    return bool(re.search(r"계산|금액|￦|\d{3,}", stem))


def wrong_choice_coverage(q, override):
    correct = int(q["answer"])
    choices = q.get("choices", [])
    wrong_count = len(choices) - 1
    if wrong_count <= 0:
        return True, 1.0

    if not override or not override.get("wrongAnswerAnalysis"):
        return False, 0.0

    wa = override["wrongAnswerAnalysis"]
    covered = 0
    for i in range(len(choices)):
        num = i + 1
        if num == correct:
            continue
        reason = wa.get(str(num)) or wa.get(num)
        if reason and len(str(reason).strip()) >= 8:
            covered += 1
    return covered == wrong_count, covered / wrong_count


def test_content_files():
    for rel in [
        "js/ai-tutor-content/pattern-profiles.js",
        "js/ai-tutor-content/question-overrides.js",
        "js/ai-tutor-content/calculation-templates.js",
        "js/ai-tutor-engine.js",
    ]:
        assert (ROOT / rel).exists(), rel
    eng = (ROOT / "js" / "ai-tutor-engine.js").read_text(encoding="utf-8")
    assert "pattern-profiles.js" in eng
    assert "question-overrides.js" in eng
    assert "calculation-templates.js" in eng
    assert "getQuestionOverride" in eng
    print("  PASS: Phase 5.1 content layer files & engine imports")


def test_eight_sections():
    eng = (ROOT / "js" / "ai-tutor-engine.js").read_text(encoding="utf-8")
    for sid in [
        "why-wrong",
        "solving-order",
        "exam-thinking",
        "memory-tip",
        "examiner-trap",
        "related-pattern",
        "similar-problems",
        "next-learning",
    ]:
        assert sid in eng, sid
    for title in [
        "① 왜 틀렸는가",
        "② 올바른 풀이순서",
        "③ 시험장에서 생각하는 순서",
        "④ 암기법",
        "⑤ 출제자의 함정",
        "⑥ 관련 Pattern",
        "⑦ 비슷한 문제",
        "⑧ 다음 추천학습",
    ]:
        assert title in eng, title
    assert ".slice(0, 200)" not in eng, "explanation truncate must be removed"
    print("  PASS: 8-step tutor structure maintained (no 200-char truncate)")


def test_quality_gates():
    questions = json.loads((ROOT / "data" / "question-db.json").read_text(encoding="utf-8"))
    overrides = load_overrides()
    target = [q for q in questions if q["patternId"] in TARGET_PATTERNS]

    resolvable = 0
    calc_total = 0
    calc_resolvable = 0
    wa_ok = 0
    mismatch_fixed = 0

    for q in target:
        oid = q["questionId"]
        ov = overrides.get(oid)
        if ov and ov.get("resolvable"):
            resolvable += 1
        if is_calculation(q, ov):
            calc_total += 1
            if ov and ov.get("resolvable"):
                calc_resolvable += 1
        ok, _ = wrong_choice_coverage(q, ov)
        if ok:
            wa_ok += 1
        if oid in PATTERN_MISMATCH_IDS and ov and ov.get("resolvable"):
            mismatch_fixed += 1

    resolvable_rate = resolvable / max(len(target), 1)
    calc_rate = calc_resolvable / max(calc_total, 1)
    wa_rate = wa_ok / max(len(target), 1)

    print(f"  Target questions: {len(target)}")
    print(f"  Overrides loaded: {len(overrides)}")
    print(f"  Resolvable rate: {resolvable_rate:.1%} (gate ≥{THRESHOLDS['resolvable_rate']:.0%})")
    print(f"  Calc resolvable: {calc_rate:.1%} (gate ≥{THRESHOLDS['calc_resolvable_rate']:.0%}, n={calc_total})")
    print(f"  Per-choice wrongAnswerAnalysis: {wa_rate:.1%} (gate ≥{THRESHOLDS['wrong_analysis_rate']:.0%})")
    print(f"  Pattern mismatch fixed: {mismatch_fixed}/{len(PATTERN_MISMATCH_IDS)}")

    assert resolvable_rate >= THRESHOLDS["resolvable_rate"], f"resolvable {resolvable_rate:.1%}"
    assert calc_rate >= THRESHOLDS["calc_resolvable_rate"], f"calc {calc_rate:.1%}"
    assert wa_rate >= THRESHOLDS["wrong_analysis_rate"], f"wrongAnswerAnalysis {wa_rate:.1%}"
    assert mismatch_fixed == len(PATTERN_MISMATCH_IDS), "pattern mismatch not fully fixed"
    print("  PASS: Phase 5.1 quality gates")


def test_freeze():
    manifest = json.loads((ROOT / "data" / "phase1-freeze-manifest.json").read_text(encoding="utf-8"))
    for name, meta in manifest["files"].items():
        digest = hashlib.sha256((ROOT / "data" / name).read_bytes()).hexdigest()
        assert digest == meta["sha256"], name
    print("  PASS: Phase 1 freeze unchanged")


def main():
    print("\n=== Phase 5.1 AI Tutor Quality Enhancement Validation ===\n")
    failed = 0
    for fn in [
        test_content_files,
        test_eight_sections,
        test_quality_gates,
        test_freeze,
    ]:
        try:
            fn()
        except Exception as e:
            print(f"  FAIL: {fn.__name__}: {e}")
            failed += 1
    print(f"\n=== Result: {'PASS' if failed == 0 else f'{failed} failed'} ===\n")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
