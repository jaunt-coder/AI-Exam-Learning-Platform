# -*- coding: utf-8 -*-
"""
Sprint-10B — Study Pilot under stabilized Learning Policy.

Replays the same 20Q / 30Q scenario shape as Sprint-10A and compares:
MASTERED / Weakness / Plan / Strategy / Plan Duplicate counts.
Loads thresholds from data/learning-policy.json (no Q/P/Master mutation).
"""
from __future__ import annotations

import hashlib
import json
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
Q_PATH = ROOT / "data/question-db-mvp.json"
P_PATH = ROOT / "data/pattern-db-mvp.json"
POLICY_PATH = ROOT / "data/learning-policy.json"
OUT_DIR = ROOT / "data/analysis"
OUT_JSON = OUT_DIR / "sprint-10B-pilot-metrics.json"

EXPECTED_QSHA = "66c92f0b416a03cb0c58e942d8812dfd42f8fefc42c53fea54d7c4be4e8b3a20"

# Sprint-10A baseline (from sprint-10A-pilot-metrics / report)
BASELINE_10A = {
    "20": {
        "mastered": 0,
        "weaknessActiveSignals": 5,  # CONCEPT_ERROR 4 + LOW_ACCURACY 1
        "plans": 13,
        "strategies": 13,
        "planDuplicateExtra": 7,
    },
    "30": {
        "mastered": 5,
        "weaknessActiveSignals": 8,  # CONCEPT 6 + LOW 1 + REPEATED 1
        "plans": 27,
        "strategies": 27,
        "planDuplicateExtra": 19,
    },
}

POLICY = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
SIGNAL_TO_ACTION = {
    "LOW_ACCURACY": "RETRY_PATTERN",
    "REPEATED_MISS": "REVIEW_CONCEPT",
    "CALCULATION_ERROR": "PRACTICE_CALCULATION",
    "CONCEPT_ERROR": "REVIEW_CONCEPT",
    "SLOW_RESPONSE": "MOCK_TEST",
}
ACTION_TO_STRATEGY = {
    "RETRY_PATTERN": {
        "strategyType": "PATTERN_RETRY_SET",
        "nextAction": "SOLVE_PATTERN_SET",
        "questionCount": 5,
        "reviewAfterDays": 3,
    },
    "REVIEW_CONCEPT": {
        "strategyType": "CONCEPT_REVIEW_SET",
        "nextAction": "REVIEW_CONCEPT_CARD",
        "questionCount": 3,
        "reviewAfterDays": 2,
    },
    "PRACTICE_CALCULATION": {
        "strategyType": "CALC_DRILL_SET",
        "nextAction": "SOLVE_CALCULATION_DRILL",
        "questionCount": 5,
        "reviewAfterDays": 3,
    },
    "MOCK_TEST": {
        "strategyType": "TIMED_PRACTICE",
        "nextAction": "MINI_TEST",
        "questionCount": 10,
        "reviewAfterDays": 7,
    },
}
SEVERITY_PRIORITY = {"high": 3, "medium": 2, "low": 1}


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def eff_pattern(q):
    return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")


def compute_mastery_level(attempts, accuracy):
    m = POLICY["mastery"]
    n = int(attempts or 0)
    if n == 0:
        return "UNKNOWN"
    if n < int(m["learningMaxAttempts"]):
        return "LEARNING"
    acc = accuracy if isinstance(accuracy, (int, float)) else 0.0
    if acc < float(m["retryAccuracyBelow"]):
        return "RETRY_REQUIRED"
    if n >= int(m["masteredMinAttempts"]) and acc >= float(m["masteredMinAccuracy"]):
        return "MASTERED"
    return "DEVELOPING"


def resolve_error_domain(pattern_id):
    if isinstance(pattern_id, str) and pattern_id.startswith("COST_"):
        return "cost"
    return "concept"


def severity_for_accuracy(attempts, accuracy):
    if accuracy is None:
        return "low"
    if accuracy < 0.4 or attempts >= 8:
        return "high"
    if accuracy < 0.6:
        return "medium"
    return "low"


def detect_weakness(mastery, context):
    w = POLICY["weakness"]
    gates = w["signalGates"]
    pattern_id = mastery.get("patternId") or ""
    attempts = int(mastery.get("attempts") or 0)
    incorrect = int(mastery.get("incorrectCount") or 0)
    accuracy = mastery.get("accuracy")
    signals = []

    if (
        attempts >= int(w["lowAccuracyMinAttempts"])
        and isinstance(accuracy, (int, float))
        and accuracy < float(w["lowAccuracyThreshold"])
    ):
        signals.append(
            {
                "type": "LOW_ACCURACY",
                "count": max(1, incorrect),
                "severity": severity_for_accuracy(attempts, accuracy),
            }
        )

    if incorrect >= int(gates["REPEATED_MISS"]):
        signals.append(
            {
                "type": "REPEATED_MISS",
                "count": incorrect,
                "severity": "high" if incorrect >= 5 else "medium" if incorrect >= 3 else "low",
            }
        )

    if context.get("lastCorrect") is False and pattern_id:
        domain = resolve_error_domain(pattern_id)
        signals.append(
            {
                "type": "CALCULATION_ERROR" if domain == "cost" else "CONCEPT_ERROR",
                "count": 1,
                "severity": "medium",
            }
        )

    duration_ms = context.get("durationMs")
    if isinstance(duration_ms, (int, float)) and duration_ms >= int(w["slowResponseMs"]):
        signals.append(
            {
                "type": "SLOW_RESPONSE",
                "count": 1,
                "severity": "high"
                if duration_ms >= int(w["slowResponseMs"]) * 2
                else "medium",
            }
        )
    return {"patternId": pattern_id, "weaknessSignals": signals}


def merge_weakness_signals(existing, incoming):
    rank = {"low": 1, "medium": 2, "high": 3}
    m = {}
    for s in existing or []:
        if not s or not s.get("type"):
            continue
        m[s["type"]] = {
            "type": s["type"],
            "count": int(s.get("count") or 0),
            "severity": s.get("severity") or "low",
        }
    for s in incoming or []:
        if not s or not s.get("type"):
            continue
        t = s["type"]
        prev = m.get(t)
        if not prev:
            m[t] = {
                "type": t,
                "count": int(s.get("count") or 1),
                "severity": s.get("severity") or "low",
            }
            continue
        if t in ("CALCULATION_ERROR", "CONCEPT_ERROR"):
            prev["count"] = int(prev["count"] or 0) + int(s.get("count") or 1)
        else:
            prev["count"] = int(s.get("count") or prev["count"])
        ra = rank.get(prev.get("severity"), 0)
        rb = rank.get(s.get("severity"), 0)
        if rb >= ra:
            prev["severity"] = s.get("severity") or prev.get("severity") or "low"
        m[t] = prev

    for t in ("LOW_ACCURACY", "REPEATED_MISS", "SLOW_RESPONSE"):
        if not any(x.get("type") == t for x in (incoming or [])):
            m.pop(t, None)
    for s in incoming or []:
        if s and s.get("type") in ("LOW_ACCURACY", "REPEATED_MISS", "SLOW_RESPONSE"):
            m[s["type"]] = {
                "type": s["type"],
                "count": int(s.get("count") or 1),
                "severity": s.get("severity") or "low",
            }
    return sorted(m.values(), key=lambda x: x["type"])


def gate_weakness_signals(signals):
    gates = POLICY["weakness"]["signalGates"]
    out = []
    for s in signals or []:
        min_c = int(gates.get(s["type"], 1))
        if int(s.get("count") or 0) >= min_c:
            out.append(s)
    return out


def resolve_strategy_from_plan(plan):
    mapping = ACTION_TO_STRATEGY.get(plan.get("actionType"))
    if not mapping:
        return None
    pattern_id = plan.get("patternId") or plan.get("target") or ""
    if not pattern_id:
        return None
    return {
        "strategyId": f"strat_{pattern_id}_{mapping['strategyType']}_{int(time.time()*1000)}",
        "patternId": pattern_id,
        "sourcePlanId": plan.get("planId"),
        "strategyType": mapping["strategyType"],
        "nextAction": mapping["nextAction"],
        "questionCount": mapping["questionCount"],
        "reviewAfterDays": mapping["reviewAfterDays"],
        "createdAt": utc_now(),
    }


class PilotStore:
    def __init__(self, student_id="pilot_10B_student"):
        self.student_id = student_id
        self.attempts = {"events": []}
        self.mastery = {"patterns": []}
        self.weakness = {"patterns": []}
        self.plans = {"plans": []}
        self.strategies = {"strategies": []}
        self.transitions = []

    def find_mastery(self, pattern_id):
        for p in self.mastery["patterns"]:
            if p.get("studentId") == self.student_id and p.get("patternId") == pattern_id:
                return p
        return None

    def find_active_plan(self, pattern_id, action_type):
        active = set(POLICY["plan"]["dedupeStatuses"])
        for p in self.plans["plans"]:
            if (
                p.get("patternId") == pattern_id
                and p.get("actionType") == action_type
                and p.get("status") in active
            ):
                return p
        return None

    def run_cycle(self, question, correct, duration_ms):
        pattern_id = eff_pattern(question)
        qid = question.get("id") or question.get("questionId")
        ts = utc_now()

        self.attempts["events"].append(
            {
                "event_id": f"evt_pilot_{len(self.attempts['events'])+1:04d}",
                "question_id": qid,
                "pattern_id": pattern_id,
                "result": "correct" if correct else "incorrect",
                "timestamp": ts,
            }
        )

        entry = self.find_mastery(pattern_id)
        if not entry:
            entry = {
                "patternId": pattern_id,
                "studentId": self.student_id,
                "attempts": 0,
                "correctCount": 0,
                "incorrectCount": 0,
                "accuracy": None,
                "masteryLevel": "UNKNOWN",
            }
            self.mastery["patterns"].append(entry)
        entry["attempts"] = int(entry["attempts"]) + 1
        if correct:
            entry["correctCount"] = int(entry["correctCount"]) + 1
        else:
            entry["incorrectCount"] = int(entry["incorrectCount"]) + 1
        entry["accuracy"] = entry["correctCount"] / entry["attempts"]
        entry["masteryLevel"] = compute_mastery_level(entry["attempts"], entry["accuracy"])

        detected = detect_weakness(entry, {"lastCorrect": correct, "durationMs": duration_ms})
        w_idx = next(
            (
                i
                for i, p in enumerate(self.weakness["patterns"])
                if p.get("studentId") == self.student_id and p.get("patternId") == pattern_id
            ),
            -1,
        )
        prev_signals = self.weakness["patterns"][w_idx].get("signals") if w_idx >= 0 else []
        merged = merge_weakness_signals(prev_signals, detected["weaknessSignals"])
        active = gate_weakness_signals(merged)
        w_entry = {
            "patternId": pattern_id,
            "studentId": self.student_id,
            "signals": merged,
            "activeSignals": active,
        }
        if w_idx >= 0:
            self.weakness["patterns"][w_idx] = w_entry
        else:
            self.weakness["patterns"].append(w_entry)

        created_plans = []
        updated_plans = []
        created_strats = []
        # unique action candidates from active signals
        by_action = {}
        for signal in active:
            action = SIGNAL_TO_ACTION.get(signal["type"])
            if not action:
                continue
            pr = SEVERITY_PRIORITY.get(signal.get("severity"), 1)
            prev = by_action.get(action)
            if not prev or pr > prev["priority"]:
                by_action[action] = {
                    "actionType": action,
                    "priority": pr,
                    "weaknessSignal": signal["type"],
                    "signalCount": int(signal.get("count") or 1),
                }

        for action, meta in by_action.items():
            existing = self.find_active_plan(pattern_id, action)
            if existing:
                existing["attemptCount"] = int(existing.get("attemptCount") or 1) + 1
                existing["priority"] = max(int(existing.get("priority") or 0), meta["priority"])
                existing["lastSeen"] = ts
                updated_plans.append(existing)
                continue
            plan = {
                "planId": f"plan_{pattern_id}_{action}_{len(self.plans['plans'])+1}",
                "patternId": pattern_id,
                "weaknessSignal": meta["weaknessSignal"],
                "priority": meta["priority"],
                "actionType": action,
                "target": pattern_id,
                "status": POLICY["plan"]["defaultStatus"],
                "signalCount": meta["signalCount"],
                "attemptCount": 1,
                "lastSeen": ts,
                "createdAt": ts,
            }
            self.plans["plans"].append(plan)
            created_plans.append(plan)
            strat = resolve_strategy_from_plan(plan)
            if strat:
                slim = {
                    "strategyId": strat["strategyId"],
                    "patternId": strat["patternId"],
                    "strategyType": strat["strategyType"],
                    "createdAt": strat["createdAt"],
                }
                self.strategies["strategies"].append(slim)
                created_strats.append(slim)

        self.transitions.append(
            {
                "questionId": qid,
                "patternId": pattern_id,
                "correct": correct,
                "activeSignals": [s["type"] for s in active],
                "plansCreated": len(created_plans),
                "plansUpdated": len(updated_plans),
                "strategiesCreated": len(created_strats),
                "masteryLevel": entry["masteryLevel"],
            }
        )


def build_scenario(questions, n):
    """Same selection / outcome schedule as Sprint-10A pilot."""
    by_pat = defaultdict(list)
    for q in questions:
        by_pat[eff_pattern(q)].append(q)
    patterns = sorted(by_pat.keys(), key=lambda p: (-len(by_pat[p]), p))
    focus = patterns[:6]
    selected = []
    idx = {p: 0 for p in patterns}
    while len(selected) < n:
        for p in focus:
            if len(selected) >= n:
                break
            arr = by_pat[p]
            if idx[p] < len(arr):
                selected.append(arr[idx[p]])
                idx[p] += 1
        if all(idx[p] >= len(by_pat[p]) for p in focus):
            break
    if len(selected) < n:
        used = {q.get("id") for q in selected}
        for q in questions:
            if q.get("id") not in used:
                selected.append(q)
            if len(selected) >= n:
                break
    selected = selected[:n]
    focus_a = focus[0] if focus else None
    focus_b = focus[1] if len(focus) > 1 else None
    outcomes = []
    for i, q in enumerate(selected):
        pid = eff_pattern(q)
        if pid == focus_a and i < n * 0.55:
            correct = i % 3 != 0
        elif pid == focus_b and i < n * 0.7:
            correct = i % 4 != 0
        else:
            correct = i % 5 != 0
        duration = 45000
        if not correct and i % 7 == 0:
            duration = 150000
        if pid and pid.startswith("COST_") and not correct:
            duration = max(duration, 60000)
        outcomes.append((q, correct, duration))
    return outcomes, {"focusA": focus_a, "focusB": focus_b}


def summarize(store, n):
    mastery_levels = Counter(p["masteryLevel"] for p in store.mastery["patterns"])
    active_signal_types = Counter()
    active_total = 0
    for p in store.weakness["patterns"]:
        for s in p.get("activeSignals") or []:
            active_signal_types[s["type"]] += 1
            active_total += 1

    plan_keys = [(p["patternId"], p["actionType"]) for p in store.plans["plans"]]
    plan_dup_extra = sum(c - 1 for c in Counter(plan_keys).values() if c > 1)

    return {
        "n": n,
        "correct": sum(1 for t in store.transitions if t["correct"]),
        "incorrect": sum(1 for t in store.transitions if not t["correct"]),
        "masteryLevels": dict(mastery_levels),
        "mastered": mastery_levels.get("MASTERED", 0),
        "weaknessActiveSignals": active_total,
        "weaknessSignalTypes": dict(active_signal_types),
        "plans": len(store.plans["plans"]),
        "strategies": len(store.strategies["strategies"]),
        "planDuplicateExtra": plan_dup_extra,
        "planDuplicateKeys": sum(1 for c in Counter(plan_keys).values() if c > 1),
        "masteryEntries": [
            {
                "patternId": p["patternId"],
                "attempts": p["attempts"],
                "accuracy": round(p["accuracy"], 4) if p["accuracy"] is not None else None,
                "masteryLevel": p["masteryLevel"],
            }
            for p in sorted(
                store.mastery["patterns"], key=lambda x: (-x["attempts"], x["patternId"])
            )
        ],
    }


def freeze_checks():
    qsha = hashlib.sha256(Q_PATH.read_bytes()).hexdigest()
    qs = json.loads(Q_PATH.read_text(encoding="utf-8"))["questions"]
    ps = json.loads(P_PATH.read_text(encoding="utf-8"))

    def eff(q):
        return q["primaryPattern"] if q.get("primaryPattern") is not None else q.get("patternId")

    mism = sum(
        1
        for p in ps
        if p.get("frequency") != sum(1 for q in qs if eff(q) == p["patternId"])
    )
    return {
        "questionDbUnchanged": qsha == EXPECTED_QSHA,
        "questions240": len(qs) == 240,
        "primaryPattern20": sum(1 for q in qs if q.get("primaryPattern")) == 20,
        "frequencyMismatch": mism,
    }


def run_session(questions, n):
    outcomes, meta = build_scenario(questions, n)
    store = PilotStore()
    for q, correct, duration in outcomes:
        store.run_cycle(q, correct, duration)
    summary = summarize(store, n)
    summary["meta"] = meta
    return summary


def compare(label, current, baseline):
    return {
        "session": label,
        "MASTERED": {"10A": baseline["mastered"], "10B": current["mastered"]},
        "Weakness": {
            "10A": baseline["weaknessActiveSignals"],
            "10B": current["weaknessActiveSignals"],
        },
        "Plan": {"10A": baseline["plans"], "10B": current["plans"]},
        "Strategy": {"10A": baseline["strategies"], "10B": current["strategies"]},
        "PlanDuplicate": {
            "10A": baseline["planDuplicateExtra"],
            "10B": current["planDuplicateExtra"],
        },
        "improved": {
            "masteredSlowerOrEqual": current["mastered"] <= baseline["mastered"],
            "plansReduced": current["plans"] < baseline["plans"],
            "strategiesReduced": current["strategies"] < baseline["strategies"],
            "duplicatesGone": current["planDuplicateExtra"] == 0,
            "weaknessReducedOrEqual": current["weaknessActiveSignals"]
            <= baseline["weaknessActiveSignals"],
        },
    }


def main():
    freeze = freeze_checks()
    assert freeze["questionDbUnchanged"]
    assert freeze["questions240"]
    assert freeze["frequencyMismatch"] == 0
    assert freeze["primaryPattern20"]

    qs = json.loads(Q_PATH.read_text(encoding="utf-8"))["questions"]
    s20 = run_session(qs, 20)
    s30 = run_session(qs, 30)
    c20 = compare("20Q", s20, BASELINE_10A["20"])
    c30 = compare("30Q", s30, BASELINE_10A["30"])

    payload = {
        "sprint": "Sprint-10B",
        "generatedAt": utc_now(),
        "policy": POLICY,
        "freeze": freeze,
        "session20": s20,
        "session30": s30,
        "comparison": {"20Q": c20, "30Q": c30},
        "guarantees": {
            "question_db_untouched": True,
            "pattern_db_untouched": True,
            "master_db_untouched": True,
            "evidence_untouched": True,
            "no_llm": True,
        },
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print("=== Sprint-10B Policy Pilot ===")
    print("policy mastery:", POLICY["mastery"])
    print("policy gates:", POLICY["weakness"]["signalGates"])
    print("20Q", s20["mastered"], "MASTERED;", s20["plans"], "plans;", s20["strategies"], "strats; dup", s20["planDuplicateExtra"])
    print("30Q", s30["mastered"], "MASTERED;", s30["plans"], "plans;", s30["strategies"], "strats; dup", s30["planDuplicateExtra"])
    print("compare20", json.dumps(c20, ensure_ascii=False))
    print("compare30", json.dumps(c30, ensure_ascii=False))
    print("wrote", OUT_JSON)
    assert s20["planDuplicateExtra"] == 0 and s30["planDuplicateExtra"] == 0
    assert s20["mastered"] <= BASELINE_10A["20"]["mastered"]
    assert s30["mastered"] < BASELINE_10A["30"]["mastered"]
    assert s20["plans"] < BASELINE_10A["20"]["plans"]
    assert s30["plans"] < BASELINE_10A["30"]["plans"]
    print("Sprint-10B study pilot: PASS")


if __name__ == "__main__":
    main()
