#!/usr/bin/env python3
"""Validate Coach Phase C3 — Weakness Diagnosis Engine.

Run:
    py -3 scripts/validate-coach-phase3.py
    py -3 scripts/validate-coach-phase3.py --write-mock
    py -3 scripts/validate-coach-phase3.py --write-baseline
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COACH = ROOT / "data" / "coach"
ATTEMPTS = COACH / "mock-attempts.json"
CONFIG = COACH / "weakness-config.json"
MOCK_WEAKNESS = COACH / "mock-weakness.json"
BASELINE = COACH / "phase3-protected-checksums.json"
GENERATED_AT = "2026-07-20T12:00:00.000Z"

PATTERN_RE = re.compile(r"^ACC_[A-Z]+_\d{3}$")
ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$")
SEVERITIES = {"critical", "weak", "normal", "mastered"}
TRENDS = {"improving", "declining", "stable", "insufficient_data"}

PROTECTED_GLOBS = [
    "data/question-db-mvp.json",
    "scripts/parser/*.py",
    "scripts/exam_pipeline/*.py",
    "js/question-engine.js",
    "js/shared-renderer.js",
    "js/data-cleaner.js",
    "js/ai-tutor-engine.js",
    "js/ai-tutor.js",
    "js/recommendation-engine.js",
    "js/recommendation-rules.js",
]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def collect_protected() -> dict[str, str]:
    out: dict[str, str] = {}
    for pattern in PROTECTED_GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            if path.is_file():
                out[path.relative_to(ROOT).as_posix()] = sha256_file(path)
    return out


def load_config() -> dict:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def compute_trend(sorted_attempts: list[dict], cfg: dict) -> str:
    if len(sorted_attempts) < cfg["minAttemptsForTrend"]:
        return "insufficient_data"
    window = cfg["recentWindow"]
    recent = sorted_attempts[-window:]
    prior = sorted_attempts[: len(sorted_attempts) - len(recent)]
    if not prior:
        return "insufficient_data"
    recent_acc = sum(1 for a in recent if a.get("isCorrect")) / len(recent)
    prior_acc = sum(1 for a in prior if a.get("isCorrect")) / len(prior)
    delta = recent_acc - prior_acc
    if delta >= cfg["trend"]["improvingDelta"]:
        return "improving"
    if delta <= cfg["trend"]["decliningDelta"]:
        return "declining"
    return "stable"


def assign_severity(stats: dict, cfg: dict) -> str:
    s = cfg["severity"]
    accuracy = stats["accuracy"]
    wrong = stats["wrongCount"]
    total = stats["totalAttempts"]
    avg_el = stats["averageElapsedSeconds"]

    if total < cfg["minAttemptsForSeverity"]:
        return "normal"
    if total >= s["mastered"]["minAttempts"] and accuracy >= s["mastered"]["minAccuracy"]:
        return "mastered"

    severity = "normal"
    if accuracy <= s["critical"]["maxAccuracy"] and wrong >= s["critical"]["minWrong"]:
        severity = "critical"
    elif accuracy <= s["weak"]["maxAccuracy"]:
        severity = "weak"

    tb = s["timeoutBoost"]
    if avg_el >= tb["whenAverageElapsedGte"] and severity == tb["from"]:
        severity = tb["to"]
    tw = s["timeoutBoostWeakToCritical"]
    if (
        tw.get("enabled")
        and avg_el >= tw["whenAverageElapsedGte"]
        and severity == "weak"
        and accuracy <= tw["maxAccuracy"]
    ):
        severity = "critical"
    return severity


def diagnose(attempts: list[dict], cfg: dict) -> list[dict]:
    by: dict[str, list[dict]] = {}
    for row in attempts:
        pid = row.get("patternId")
        if not pid:
            continue
        by.setdefault(pid, []).append(row)
    reports = []
    for pid in sorted(by):
        rows = sorted(by[pid], key=lambda a: a.get("timestamp") or "")
        total = len(rows)
        correct = sum(1 for a in rows if a.get("isCorrect"))
        wrong = total - correct
        accuracy = correct / total if total else 0.0
        avg_el = sum(float(a.get("elapsedSeconds") or 0) for a in rows) / total if total else 0.0
        trend = compute_trend(rows, cfg)
        severity = assign_severity(
            {
                "accuracy": accuracy,
                "wrongCount": wrong,
                "totalAttempts": total,
                "averageElapsedSeconds": avg_el,
            },
            cfg,
        )
        reports.append(
            {
                "patternId": pid,
                "totalAttempts": total,
                "correctCount": correct,
                "wrongCount": wrong,
                "accuracy": accuracy,
                "averageElapsedSeconds": avg_el,
                "recentTrend": trend,
                "severity": severity,
                "generatedAt": GENERATED_AT,
            }
        )
    return reports


def round_report(r: dict) -> dict:
    out = dict(r)
    out["accuracy"] = round(float(out["accuracy"]), 10)
    out["averageElapsedSeconds"] = round(float(out["averageElapsedSeconds"]), 10)
    return out


def validate_modules(errors: list[str]) -> None:
    required = [
        "js/coach/models/weakness-report.js",
        "js/coach/config/weakness-config.js",
        "js/coach/diagnosis/severity-rules.js",
        "js/coach/diagnosis/weakness-engine.js",
        "js/coach/stores/weaknessStore.js",
        "data/coach/weakness-config.json",
    ]
    for rel in required:
        if not (ROOT / rel).exists():
            errors.append(f"missing {rel}")

    storage = (ROOT / "js/storage.js").read_text(encoding="utf-8")
    if "coach.weakness.v1" not in storage:
        errors.append("storage.js missing coach.weakness.v1")

    engine = (ROOT / "js/coach/diagnosis/weakness-engine.js").read_text(encoding="utf-8")
    for banned in ("추천", "풀어라", "강의", "OpenAI", "explain"):
        if banned in engine:
            errors.append(f"weakness-engine contains forbidden concern: {banned}")

    # config sync: JS must mention same mastered minAccuracy
    js_cfg = (ROOT / "js/coach/config/weakness-config.js").read_text(encoding="utf-8")
    cfg = load_config()
    needle = str(cfg["severity"]["mastered"]["minAccuracy"])
    if needle not in js_cfg:
        errors.append("weakness-config.js out of sync with weakness-config.json")

    qe = (ROOT / "js/question-engine.js").read_text(encoding="utf-8")
    if "weakness-engine" in qe or "coach/diagnosis" in qe:
        errors.append("question-engine must not import diagnosis")


def validate_reports(reports: list[dict], errors: list[str]) -> None:
    if not reports:
        errors.append("no reports generated")
    for r in reports:
        if not PATTERN_RE.match(r.get("patternId", "")):
            errors.append(f"bad patternId {r.get('patternId')}")
        if r.get("severity") not in SEVERITIES:
            errors.append(f"bad severity {r.get('severity')}")
        if r.get("recentTrend") not in TRENDS:
            errors.append(f"bad trend {r.get('recentTrend')}")
        if not ISO_RE.match(str(r.get("generatedAt", ""))):
            errors.append(f"bad generatedAt {r.get('generatedAt')}")
        if not (0 <= float(r.get("accuracy", -1)) <= 1):
            errors.append(f"accuracy out of range for {r.get('patternId')}")

    # scenario coverage
    by = {r["patternId"]: r for r in reports}
    if "ACC_INV_003" not in by or by["ACC_INV_003"]["severity"] not in {"critical", "weak"}:
        errors.append("expected ACC_INV_003 repeated-wrong → critical|weak")
    if "ACC_FIN_001" not in by or by["ACC_FIN_001"]["averageElapsedSeconds"] < 300:
        errors.append("expected ACC_FIN_001 timeout pattern (avg elapsed >= 300)")
    if "ACC_PPE_002" not in by or by["ACC_PPE_002"]["recentTrend"] != "improving":
        errors.append("expected ACC_PPE_002 recentTrend improving")
    if "ACC_EQ_001" not in by or by["ACC_EQ_001"]["severity"] != "mastered":
        errors.append("expected ACC_EQ_001 mastered")


def validate_checksums(errors: list[str], write_baseline: bool) -> None:
    current = collect_protected()
    if write_baseline:
        BASELINE.write_text(
            json.dumps({"files": current}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"wrote {BASELINE.relative_to(ROOT)} ({len(current)} files)")
        return
    if not BASELINE.exists():
        errors.append("missing phase3-protected-checksums.json")
        return
    base = json.loads(BASELINE.read_text(encoding="utf-8")).get("files") or {}
    for rel, digest in base.items():
        if rel not in current:
            errors.append(f"protected missing: {rel}")
        elif current[rel] != digest:
            errors.append(f"checksum changed: {rel}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-mock", action="store_true")
    parser.add_argument("--write-baseline", action="store_true")
    args = parser.parse_args()

    errors: list[str] = []
    if not ATTEMPTS.exists() or not CONFIG.exists():
        print("FAIL: mock-attempts or weakness-config missing")
        return 1

    cfg = load_config()
    attempts = json.loads(ATTEMPTS.read_text(encoding="utf-8"))
    reports = [round_report(r) for r in diagnose(attempts, cfg)]

    if args.write_mock:
        MOCK_WEAKNESS.write_text(
            json.dumps(reports, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"wrote {MOCK_WEAKNESS.relative_to(ROOT)} ({len(reports)} reports)")

    if args.write_baseline:
        validate_checksums([], write_baseline=True)

    validate_modules(errors)
    validate_reports(reports, errors)

    if MOCK_WEAKNESS.exists():
        expected = json.loads(MOCK_WEAKNESS.read_text(encoding="utf-8"))
        # deterministic reproduce
        exp_norm = [round_report(r) for r in expected]
        if exp_norm != reports:
            errors.append("Attempt → Report not reproducible vs mock-weakness.json")
            # show first diff
            if len(exp_norm) != len(reports):
                errors.append(f"count {len(reports)} != expected {len(exp_norm)}")
            else:
                for a, b in zip(exp_norm, reports):
                    if a != b:
                        errors.append(f"diff at {a.get('patternId')}: {a} vs {b}")
                        break
        # second run identical
        reports2 = [round_report(r) for r in diagnose(attempts, cfg)]
        if reports2 != reports:
            errors.append("diagnosis not deterministic")
    else:
        errors.append("missing mock-weakness.json (run --write-mock)")

    if not args.write_baseline:
        validate_checksums(errors, write_baseline=False)

    if errors:
        print("FAIL Coach Phase C3")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS Coach Phase C3")
    print(f"  reports: {len(reports)}")
    print("  key: coach.weakness.v1")
    print("  deterministic: ok")
    print("  protected checksums: ok")
    for r in reports:
        if r["severity"] in {"critical", "weak", "mastered"} or r["recentTrend"] == "improving":
            print(
                f"  · {r['patternId']}: sev={r['severity']} "
                f"acc={r['accuracy']:.2f} trend={r['recentTrend']}"
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
