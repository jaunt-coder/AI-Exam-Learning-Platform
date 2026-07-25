#!/usr/bin/env python3
"""Unit tests for Stage 7 read-only QuestionBuilder + emit surface."""
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
from emit_surface import (  # noqa: E402
    encode_markdown_cell,
    filter_choice_body_tokens,
    join_tokens_by_geometry,
    rows_to_markdown,
)
from ir_integrity import IRIntegrityGate  # noqa: E402
from model import (  # noqa: E402
    IMMUTABLE_TYPES,
    ChoiceCandidate,
    QuestionCandidate,
    TableCandidate,
    Token,
    TokenType,
)
from question_builder import QuestionBuilder, require_frozen  # noqa: E402


def T(text, typ=TokenType.TEXT, x=0.0, y=0.0, page=1, block=0, line=0, immutable=None) -> Token:
    imm = immutable if immutable is not None else (typ in IMMUTABLE_TYPES)
    return Token(
        text=text,
        type=typ,
        bbox=(x, y, x + 10, y + 10),
        page_number=page,
        block_index=block,
        line_index=line,
        immutable=imm,
    )


def _doc_questions() -> list[QuestionCandidate]:
    questions = []
    for n in range(41, 81):
        stem = [T(f"문항{n}", TokenType.TEXT, 0, 0), T("100", TokenType.NUMBER, 20, 0)]
        markers = [T(chr(0x2460 + i), TokenType.CHOICE_MARKER, 0, 20 + i) for i in range(5)]
        bodies = [T(f"보기{i+1}", TokenType.TEXT, 15, 20 + i) for i in range(5)]
        tokens = stem + markers + bodies
        choices = [
            ChoiceCandidate(
                marker=markers[i].text,
                index=i + 1,
                tokens=[markers[i], bodies[i]],
            )
            for i in range(5)
        ]
        questions.append(
            QuestionCandidate(
                number=n,
                page_number=1,
                tokens=tokens,
                stem_tokens=stem,
                choices=choices,
                bbox=(0, 0, 100, 100),
            )
        )
    return questions


def test_require_frozen():
    ctx = ParseContext(ir_frozen=False)
    try:
        require_frozen(ctx)
        assert False, "expected RuntimeError"
    except RuntimeError:
        pass


def test_builder_refuses_unfrozen():
    ctx = ParseContext(year=2015, ir_frozen=False, questions=_doc_questions())
    try:
        QuestionBuilder(write_outputs=False, answers={n: 1 for n in range(41, 81)}).run(ctx)
        assert False, "expected RuntimeError"
    except RuntimeError:
        pass


def test_builder_emits_source_truth_records():
    questions = _doc_questions()
    # attach a table on Q41
    table = TableCandidate(rows=[["20×1", "100"], ["20×2", "200"]], kind="grid")
    table.tokens = [T("100", TokenType.NUMBER, 50, 50)]
    questions[0].table = table
    questions[0].tables = [table]

    ctx = ParseContext(year=2015, questions=questions, config=ParserConfig())
    ctx.meta_semantic = {"errorCount": 0}
    IRIntegrityGate(ctx.config).run(ctx)
    assert ctx.ir_frozen

    answers = {n: (n % 5) + 1 for n in range(41, 81)}
    QuestionBuilder(write_outputs=False, answers=answers).run(ctx)
    assert len(ctx.records) == 40
    rec = ctx.records[0]
    assert rec["questionId"] == "ACC_2015_Q041"
    assert len(rec["choices"]) == 5
    assert not any(c[:1] in "①②③④⑤" for c in rec["choices"] if c)
    assert rec["hasTable"] is True
    assert isinstance(rec["table"], str)
    assert "provenance" in rec
    for layer in ("source", "layout", "ast", "json"):
        assert layer in rec["provenance"]["layers"]
    assert ctx.sidecar_doc["questions"][0]["table"]["rows"][0][0] == "20×1"
    # Builder must not match-legacy goal
    assert ctx.meta_builder.get("recordCount") == 40


def test_join_inserts_space_by_gap_without_trim():
    a = T("A", TokenType.TEXT, 0, 0)
    b = T("B", TokenType.TEXT, 20, 0)  # gap > 1
    assert join_tokens_by_geometry([a, b]) == "A B"
    # trailing spaces in token text preserved (no trim)
    c = T("X ", TokenType.TEXT, 0, 0)
    d = T("Y", TokenType.TEXT, 5, 0)
    assert join_tokens_by_geometry([c, d]) == "X Y" or join_tokens_by_geometry([c, d]) == "X  Y"


def test_markdown_encodes_pipe():
    assert "\\|" in encode_markdown_cell("a|b")
    md = rows_to_markdown([["a|b", "2"]])
    assert "a\\|b" in md


def test_choice_filter_drops_marker():
    toks = [
        T("①", TokenType.CHOICE_MARKER),
        T("본문", TokenType.TEXT, 20),
    ]
    body = filter_choice_body_tokens(toks)
    assert len(body) == 1 and body[0].text == "본문"


def test_builder_module_bans_mutation_apis():
    src = (PARSER_DIR / "question_builder.py").read_text(encoding="utf-8")
    # strip module docstring
    src = re.sub(r'""".*?"""', "", src, flags=re.S)
    code = "\n".join(ln for ln in src.splitlines() if not ln.strip().startswith("#"))
    assert "import re" not in code
    assert "re." not in code
    # content mutation helpers forbidden in Builder body
    assert ".strip(" not in code
    assert ".replace(" not in code
    assert "repair_" not in code
    assert "normalize" not in code.lower()
    # no ACC year hardcoding branches
    assert "questionId ==" not in code


def test_emit_surface_no_regex():
    src = (PARSER_DIR / "emit_surface.py").read_text(encoding="utf-8")
    src = re.sub(r'""".*?"""', "", src, flags=re.S)
    code = "\n".join(ln for ln in src.splitlines() if not ln.strip().startswith("#"))
    assert "import re" not in code
    assert ".strip(" not in code


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
