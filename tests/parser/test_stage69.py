#!/usr/bin/env python3
"""Unit tests for Stage 6.7 Repair, 6.8 pure Validate, 6.9 IR Integrity."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PARSER_DIR = ROOT / "scripts" / "parser"
for p in (str(PARSER_DIR), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from config import ParserConfig  # noqa: E402
from context import ParseContext  # noqa: E402
from ir_integrity import IRIntegrityGate, score_question_integrity  # noqa: E402
from model import (  # noqa: E402
    IMMUTABLE_TYPES,
    ChoiceCandidate,
    QuestionCandidate,
    TableCandidate,
    Token,
    TokenType,
)
from question_builder import QuestionBuilder, require_frozen  # noqa: E402
from semantic_repair import SemanticRepair, repair_orphan_units  # noqa: E402
from semantic_validator import SemanticValidator, score_question  # noqa: E402


def T(text, typ=TokenType.TEXT, x=0.0, immutable=None) -> Token:
    imm = immutable if immutable is not None else (typ in IMMUTABLE_TYPES)
    return Token(
        text=text,
        type=typ,
        bbox=(x, 0, x + 10, 10),
        page_number=1,
        block_index=0,
        line_index=0,
        immutable=imm,
    )


def _five_choices(tokens_pool: list[Token]) -> tuple[list[Token], list[Token], list[ChoiceCandidate]]:
    """Build stem + 5 choices that exactly partition tokens_pool."""
    markers = [T(chr(0x2460 + i), TokenType.CHOICE_MARKER, 100 + i * 10) for i in range(5)]
    choice_bodies = [T(f"답{i+1}", TokenType.TEXT, 200 + i * 10) for i in range(5)]
    stem = list(tokens_pool)
    all_tokens = stem + markers + choice_bodies
    choices = []
    for i in range(5):
        ch_tokens = [markers[i], choice_bodies[i]]
        choices.append(
            ChoiceCandidate(
                marker=markers[i].text,
                index=i + 1,
                tokens=ch_tokens,
            )
        )
    return all_tokens, stem, choices


def test_repair_stage_mutates_orphan_units():
    table = TableCandidate(rows=[["￦", "100,000"]], kind="grid")
    table.cell_tokens = [[[], []]]
    cand = QuestionCandidate(number=41, page_number=1, table=table, tables=[table], tokens=[])
    ctx = ParseContext(year=2015, questions=[cand])
    SemanticRepair().run(ctx)
    assert ctx.meta_repair["orphanRepairs"] == 1
    assert cand.table.rows[0][1].startswith("￦")


def test_validator_does_not_call_repair():
    """SemanticValidator must not mutate orphan unit cells."""
    table = TableCandidate(rows=[["￦", "100,000"]], kind="grid")
    table.cell_tokens = [[[], []]]
    tokens, stem, choices = _five_choices([T("본문", TokenType.TEXT)])
    cand = QuestionCandidate(
        number=41,
        page_number=1,
        tokens=tokens,
        stem_tokens=stem,
        choices=choices,
        table=table,
        tables=[table],
    )
    before = [list(r) for r in table.rows]
    SemanticValidator().run(ParseContext(year=2015, questions=[cand]))
    assert [list(r) for r in cand.table.rows] == before


def test_integrity_passes_on_well_formed_question():
    num = T("1,000", TokenType.NUMBER, immutable=True)
    tokens, stem, choices = _five_choices([T("질문", TokenType.TEXT), num])
    cand = QuestionCandidate(
        number=41,
        page_number=1,
        tokens=tokens,
        stem_tokens=stem,
        choices=choices,
    )
    report = score_question_integrity(cand)
    assert report.passed, [v.message for v in report.violations]


def test_integrity_fails_on_partition_gap():
    tokens, stem, choices = _five_choices([T("질문", TokenType.TEXT)])
    # drop last stem token from stem_tokens → partition gap
    cand = QuestionCandidate(
        number=41,
        page_number=1,
        tokens=tokens,
        stem_tokens=stem[:-1] if stem else [],
        choices=choices,
    )
    report = score_question_integrity(cand)
    assert not report.passed
    assert any(v.check == "TokenPartition" for v in report.violations)


def test_integrity_fails_on_broken_immutable_seal():
    bad = T("1,000", TokenType.NUMBER, immutable=False)
    tokens, stem, choices = _five_choices([bad])
    cand = QuestionCandidate(
        number=41,
        page_number=1,
        tokens=tokens,
        stem_tokens=stem,
        choices=choices,
    )
    report = score_question_integrity(cand)
    assert not report.passed
    assert any(v.check == "ImmutableSeal" for v in report.violations)


def test_integrity_gate_freezes_full_document():
    questions = []
    for n in range(41, 81):
        tokens, stem, choices = _five_choices([T(f"Q{n}", TokenType.TEXT)])
        questions.append(
            QuestionCandidate(
                number=n,
                page_number=1,
                tokens=tokens,
                stem_tokens=stem,
                choices=choices,
            )
        )
    ctx = ParseContext(year=2015, questions=questions, config=ParserConfig())
    # Pretend Stage 6.8 passed
    ctx.meta_semantic = {"errorCount": 0}
    IRIntegrityGate(ctx.config).run(ctx)
    assert ctx.ir_frozen is True
    assert ctx.meta_integrity["passed"] is True


def test_integrity_gate_refuses_freeze_on_semantic_errors():
    questions = []
    for n in range(41, 81):
        tokens, stem, choices = _five_choices([T(f"Q{n}", TokenType.TEXT)])
        questions.append(
            QuestionCandidate(
                number=n,
                page_number=1,
                tokens=tokens,
                stem_tokens=stem,
                choices=choices,
            )
        )
    ctx = ParseContext(year=2015, questions=questions)
    ctx.meta_semantic = {"errorCount": 2}
    IRIntegrityGate().run(ctx)
    assert ctx.ir_frozen is False
    assert any(v["check"] == "SemanticGate" for v in ctx.meta_integrity["violations"])


def test_builder_requires_freeze():
    ctx = ParseContext(year=2015, ir_frozen=False)
    try:
        require_frozen(ctx)
        assert False, "should raise"
    except RuntimeError:
        pass
    # Unfrozen Builder must refuse (implemented Stage 7)
    try:
        QuestionBuilder(write_outputs=False, answers={}).run(ctx)
        assert False, "should raise"
    except RuntimeError:
        pass


def test_no_question_id_hardcoding_in_new_modules():
    for name in ("semantic_repair.py", "ir_integrity.py", "question_builder.py"):
        src = (PARSER_DIR / name).read_text(encoding="utf-8")
        src = re.sub(r'""".*?"""', "", src, flags=re.S)
        code = "\n".join(ln for ln in src.splitlines() if not ln.strip().startswith("#"))
        assert "ACC_" not in code or name == "question_builder.py"
        # question_builder may mention ACC_ in emit format docs inside strings — allow only in contract doc
        assert "questionId ==" not in code and "questionId==" not in code
        assert not re.search(r"\byear\s*==\s*\d{4}", code)


def _run_all() -> int:
    tests = [obj for name, obj in sorted(globals().items()) if name.startswith("test_")]
    failed = 0
    for test in tests:
        try:
            test()
            print(f"PASS {test.__name__}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL {test.__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"ERROR {test.__name__}: {exc!r}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(_run_all())
