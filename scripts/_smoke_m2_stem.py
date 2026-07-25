from pathlib import Path
import json
import re

stem = json.loads(
    Path("data/knowledge/pilot/2018/candidate/ACC_2018_Q042.json").read_text(
        encoding="utf-8"
    )
)["stem"]
BULLET = re.compile(r"^[○●◇◆▪•·]\s*")
lines = [l.rstrip() for l in stem.replace("\r\n", "\n").split("\n")]
blocks = []
buf = []


def flush():
    global buf
    if not buf:
        return
    merged = " ".join(s.strip() for s in buf if s.strip())
    merged = re.sub(r"[ \t]+", " ", merged).strip()
    if merged:
        blocks.append(merged)
    buf = []


for line in lines:
    t = line.strip()
    if not t:
        flush()
        if blocks and blocks[-1] != "":
            blocks.append("")
        continue
    if BULLET.match(t):
        flush()
        blocks.append(t)
        continue
    buf.append(t)
flush()
text = "\n\n".join(blocks)
assert "20x1년 말 현재" in text or text.startswith("20x1년 말"), text[:80]
assert "○" in text
print("STEM_PASS")
print(text.split("\n\n")[0][:100])
