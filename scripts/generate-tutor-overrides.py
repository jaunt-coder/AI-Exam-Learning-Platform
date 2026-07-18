#!/usr/bin/env python3
"""Generate js/ai-tutor-content/question-overrides.js from curated data + question-db (read-only)."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS = json.loads((ROOT / "data" / "question-db.json").read_text(encoding="utf-8"))
DATA_PATH = ROOT / "scripts" / "tutor-overrides-data.json"
OUT_PATH = ROOT / "js" / "ai-tutor-content" / "question-overrides.js"


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def main():
    overrides = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    qmap = {q["questionId"]: q for q in QUESTIONS}

    missing = [q["questionId"] for q in QUESTIONS if q["questionId"] not in overrides]
    if missing:
        raise SystemExit(f"Missing overrides: {missing}")

    lines = [
        "/**",
        " * AI Exam Learning Platform v2",
        " * Question Overrides — Phase 5.1 (DB 미변경 · 문항별 Tutor 콘텐츠)",
        " */",
        "",
        "/** @typedef {'calculation'|'concept'|'incorrect_statement'|'mixed'} QuestionType */",
        "",
        "/**",
        " * @typedef {object} QuestionOverride",
        " * @property {QuestionType} questionType",
        " * @property {string} title",
        " * @property {string} explanation",
        " * @property {string[]} solvingAlgorithm",
        " * @property {string[]} [examThinking]",
        " * @property {Record<number|string, string>} wrongAnswerAnalysis",
        " * @property {string} examinerIntent",
        " * @property {string} memoryTip",
        " * @property {string} [similarTrap]",
        " * @property {string} [frequentlyConfusedWith]",
        " * @property {boolean} resolvable",
        " */",
        "",
        "/** @type {Record<string, QuestionOverride>} */",
        "export const QUESTION_OVERRIDES = {",
    ]

    for qid in sorted(overrides.keys(), key=lambda x: int(re.search(r"Q(\d+)", x).group(1))):
        o = overrides[qid]
        q = qmap[qid]
        correct = int(q["answer"])
        wrong = o.get("wrongAnswerAnalysis", {})
        # Ensure all wrong choices covered
        for i, _ in enumerate(q["choices"], 1):
            if i == correct:
                continue
            if str(i) not in wrong and i not in wrong:
                raise SystemExit(f"{qid}: missing wrong analysis for choice {i}")

        lines.append(f"  {js_str(qid)}: {{")
        lines.append(f"    questionType: {js_str(o['questionType'])},")
        lines.append(f"    title: {js_str(o['title'])},")
        lines.append(f"    explanation: {js_str(o['explanation'])},")
        lines.append(f"    solvingAlgorithm: {js_str(o['solvingAlgorithm'])},")
        if o.get("examThinking"):
            lines.append(f"    examThinking: {js_str(o['examThinking'])},")
        wa = {str(k): v for k, v in wrong.items()}
        lines.append(f"    wrongAnswerAnalysis: {js_str(wa)},")
        lines.append(f"    examinerIntent: {js_str(o['examinerIntent'])},")
        lines.append(f"    memoryTip: {js_str(o['memoryTip'])},")
        if o.get("similarTrap"):
            lines.append(f"    similarTrap: {js_str(o['similarTrap'])},")
        if o.get("frequentlyConfusedWith"):
            lines.append(f"    frequentlyConfusedWith: {js_str(o['frequentlyConfusedWith'])},")
        lines.append(f"    resolvable: {str(o.get('resolvable', True)).lower()},")
        lines.append("  },")

    lines.extend([
        "};",
        "",
        "/** @param {string} questionId */",
        "export function getQuestionOverride(questionId) {",
        "  return QUESTION_OVERRIDES[questionId] || null;",
        "}",
        "",
        "export function getOverrideQuestionIds() {",
        "  return Object.keys(QUESTION_OVERRIDES);",
        "}",
        "",
    ])

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Generated {OUT_PATH} ({len(overrides)} overrides)")


if __name__ == "__main__":
    main()
