#!/usr/bin/env python3
"""Extract accounting answers 41-80 from CBT bank markdown export."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def extract_answers(section: str) -> dict[int, int]:
    answers: dict[int, int] = {}
    for q in range(41, 81):
        match = re.search(rf"^{q}\. .*?(?=^{q + 1}\. |\Z)", section, re.M | re.S)
        if not match:
            continue
        block = match.group(0)
        choices: dict[int, str] = {}
        for index in range(1, 6):
            choice_match = re.search(rf"^{index}\.\s*(.+)$", block, re.M)
            if choice_match:
                choices[index] = choice_match.group(1).strip()

        explanation = block.split("CBT문제은행AI", 1)[1] if "CBT문제은행AI" in block else ""
        answer = _resolve_answer(block, choices, explanation)
        if answer is not None:
            answers[q] = answer
    return answers


def _resolve_answer(block: str, choices: dict[int, str], explanation: str) -> int | None:
    header = block[:160]
    if "옳은 것은?" in header or "옳은 것을" in header:
        if "추정치" in explanation and "유용성" in explanation:
            return 5
        if "미래 경제적 효익" in explanation and "원가" in explanation:
            return 5
        for index in range(1, 6):
            fragment = choices.get(index, "")[:18]
            if fragment and fragment in explanation[:700]:
                return index

    if "옳지 않" in header or "틀린" in header:
        for index in range(1, 6):
            fragment = choices.get(index, "")[:28]
            if fragment and fragment in explanation[:600]:
                return index

    combo = re.findall(r"A\s*=\s*([0-9,]+).*?B\s*=\s*([0-9,]+)", explanation, re.S)
    if combo:
        a_value, b_value = combo[-1]
        a_value = a_value.replace(",", "")
        b_value = b_value.replace(",", "")
        for index, text in choices.items():
            if a_value in text.replace(",", "") and b_value in text.replace(",", ""):
                return index

    finals = re.findall(r"(?:최종 결과|따라서|=)\s*[:\$]?=?\s*([0-9,\.]+)", explanation)
    for value in reversed(finals):
        clean = value.replace(",", "")
        for index, text in choices.items():
            numbers = [number.replace(",", "") for number in re.findall(r"[0-9,\.]+", text)]
            if clean in numbers:
                return index

    if "25%" in explanation and any("25" in text for text in choices.values()):
        return 1

    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    text = args.input.read_text(encoding="utf-8")
    start = text.find("2과목: 회계학")
    if start < 0:
        raise SystemExit("accounting section not found")
    answers = extract_answers(text[start:])
    payload = {str(key): value for key, value in sorted(answers.items())}
    if args.output:
        args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    missing = [number for number in range(41, 81) if number not in answers]
    print(f"resolved={len(answers)} missing={missing}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
