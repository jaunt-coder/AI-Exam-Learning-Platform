#!/usr/bin/env python3
"""AI Tutor v2 quality audit (read-only — no data/*.json modification)."""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PATTERNS = {
    "ACC_INV_001": "기말재고 포함 여부 판단",
    "ACC_INV_003": "운반비·부대비용과 재고원가",
    "ACC_INV_004": "매출원가 계산 (PER법)",
    "ACC_INV_005": "PER vs PR 재고조사법",
    "ACC_INV_006": "FIFO·총평균법 매출원가",
    "ACC_INV_007": "LCM·순실현가능가치 평가",
}

# Representative sample per pattern for manual review tracking
SAMPLES = {
    "ACC_INV_001": "ACC_INV_Q001",
    "ACC_INV_003": "ACC_INV_Q011",
    "ACC_INV_004": "ACC_INV_Q005",
    "ACC_INV_005": "ACC_INV_Q014",
    "ACC_INV_006": "ACC_INV_Q002",
    "ACC_INV_007": "ACC_INV_Q003",
}

PROFILE_KEYWORDS = {
    "ACC_INV_001": ["fob", "위탁", "적송", "시송", "소유권", "운송"],
    "ACC_INV_003": ["운반", "부대", "vat", "부가", "매입할인", "재고원가", "원가 포함"],
    "ACC_INV_004": ["per", "기초", "매입", "기말", "매출원가"],
    "ACC_INV_005": ["per", "pr", "실지", "계속", "장부"],
    "ACC_INV_006": ["fifo", "선입", "총평균", "가중", "실지", "계속"],
    "ACC_INV_007": ["lcm", "순실현", "nrv", "순매", "감소손실"],
}


def stem_text(q):
    return (q.get("question", "") + " " + q.get("originalQuestion", "")).lower()


def pattern_fit_score(q):
    pid = q["patternId"]
    text = stem_text(q)
    kws = PROFILE_KEYWORDS.get(pid, [])
    hits = sum(1 for k in kws if k in text)
    return hits, len(kws)


def simulate_wrong_reason_uniqueness(q):
    """Approximate JS pickWrongReason: numeric choices often share same reason."""
    correct = int(q["answer"])
    choices = q.get("choices", [])
    reasons = set()
    text = stem_text(q)
    for i, c in enumerate(choices):
        num = i + 1
        if num == correct:
            continue
        ct = str(c).lower()
        if re.search(r"\d", ct):
            reasons.add("calc")
        elif re.search(r"vat|부가", ct) or re.search(r"vat|부가", text):
            reasons.add("vat")
        elif re.search(r"fob|선적|도착", text):
            reasons.add("fob_swap")
        else:
            reasons.add("generic")
    return len(reasons), len(choices) - 1


def main():
    questions = json.loads((ROOT / "data" / "question-db.json").read_text(encoding="utf-8"))
    eng = (ROOT / "js" / "ai-tutor-engine.js").read_text(encoding="utf-8")

    by_pattern = defaultdict(list)
    for q in questions:
        by_pattern[q["patternId"]].append(q)

    print("=== AI Tutor v2 Quality Audit ===\n")
    print(f"Total questions: {len(questions)}\n")

    for pid in PATTERNS:
        qs = by_pattern.get(pid, [])
        fits = [pattern_fit_score(q) for q in qs]
        avg_fit = sum(h / max(t, 1) for h, t in fits) / max(len(fits), 1)
        uniq = [simulate_wrong_reason_uniqueness(q) for q in qs]
        avg_uniq = sum(u / max(t, 1) for u, t in uniq) / max(len(uniq), 1)

        sample = next((q for q in qs if q["questionId"] == SAMPLES[pid]), qs[0] if qs else None)
        sample_fit = pattern_fit_score(sample) if sample else (0, 1)

        has_profile = pid in re.findall(r"(ACC_INV_\d+):", eng)
        print(f"{pid} ({PATTERNS[pid]})")
        print(f"  Questions: {len(qs)}")
        print(f"  Profile in engine: {'YES' if has_profile else 'NO'}")
        print(f"  Avg pattern-keyword fit: {avg_fit:.0%}")
        print(f"  Sample {sample['questionId'] if sample else '-'} keyword fit: {sample_fit[0]}/{sample_fit[1]}")
        print(f"  Avg wrong-reason diversity: {avg_uniq:.0%}")
        print()


if __name__ == "__main__":
    main()
