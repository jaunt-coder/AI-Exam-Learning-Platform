# Evidence Export Format

Sprint: Sprint-03 · M2.6 Evidence Pad  
Schema: `learning.evidence.v1`  
Date: 2026-07-24

---

## Principles

- Export는 **원본 관찰 로그의 사본이다.
- 변환 시 분석·점수·추천 필드를 **추가하지 않는다**.
- Question / Answer / Pattern DB와 무관하다.

---

## JSON

Filename example: `session-20260724-evidence.json`

```json
{
  "schema": "learning.evidence.v1",
  "exported_at": "2026-07-24T07:00:00.000Z",
  "count": 1,
  "records": [
    {
      "question_id": "ACC_2018_Q042",
      "pattern_id": "ACC_INV_001",
      "timestamp": "2026-07-24T06:55:12.000Z",
      "pattern_understanding": "unclear",
      "error_reason": ["condition_misread"],
      "pattern_recall": "midway",
      "confidence": 3,
      "next_action": ["review_pattern"],
      "memo": "원가 조건 재확인"
    }
  ]
}
```

MIME: `application/json;charset=utf-8`

---

## Markdown

Filename example: `session-20260724-evidence.md`

```markdown
# Session Evidence

- schema: `learning.evidence.v1`
- exported_at: 2026-07-24T07:00:00.000Z
- count: 1

---

## 1. ACC_2018_Q042

- pattern_id: `ACC_INV_001`
- timestamp: 2026-07-24T06:55:12.000Z
- pattern_understanding: unclear
- error_reason: condition_misread
- pattern_recall: midway
- confidence: 3
- next_action: review_pattern
- memo: 원가 조건 재확인
```

MIME: `text/markdown;charset=utf-8`

---

## How to export (in app)

1. 문제 제출 후 Evidence Pad 열림
2. Sidebar **Export JSON** 또는 **Export Markdown**
3. 브라우저 다운로드 (LocalStorage 원본은 유지)

---

## Intake to 07_User_Research_Analyst

Export 파일을 Primary Input으로 제출할 수 있다.  
07은 이 로그를 `docs/evidence-backlog.md`의 UR 항목으로 **사람/분석 에이전트가** 승격한다.  
Pad 자체는 UR를 자동 생성하지 않는다.
