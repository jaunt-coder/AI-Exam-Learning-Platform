#!/usr/bin/env python3
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("b", ROOT / "scripts/build-phase1-from-pdf.py")
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

pages = b.load_pages()
qym = b.build_page_year_map(pages, 6, 169)
sym = b.build_page_year_map(pages, 170, 289)
sols = b.parse_solutions(pages, sym)
raw = b.parse_questions(pages, qym)

print("Solutions 2018:", sorted(k[1] for k in sols if k[0] == 2018))
print("Inv Q 2018:", sorted(q["questionNumber"] for q in raw if q["year"] == 2018))
for k in [(2018, 2), (2018, 4), (2018, 27), (2018, 28)]:
    s = sols.get(k, {})
    print(k, "answer=", s.get("answer"), "page=", s.get("solutionPage"))

missing = []
for q in raw:
    key = (q["year"], q["questionNumber"])
    if not sols.get(key, {}).get("answer"):
        missing.append(key)
print("Missing answers:", len(missing), missing[:15])
