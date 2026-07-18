import json
from pathlib import Path
qs = json.loads(Path('data/question-db.json').read_text(encoding='utf-8'))
for q in qs:
    stem = q['question'][:70]
    print(q['questionId'], q['patternId'], q['answer'], len(q['choices']), stem)
