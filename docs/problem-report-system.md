# Problem Report System

Sprint-09A · WP-06 ~ WP-09  
Status: **ACTIVE**  
Storage: `learning.problemReports.v1`  
Date: 2026-07-26

---

## Purpose

학생이 학습 중 발견한 표·OCR·보기·해설 이상 등을 **즉시 QA로 남긴다.**  
Question DB를 고치지 않는다. Evidence와 별도 저장소다.

---

## UI

| Control | Location |
|---------|----------|
| 🐞 문제 수정 요청 | Question Header · Official Source 옆 |
| Modal | Evidence Pad와 분리된 Problem Report Modal |
| Dashboard | `settings.html` · 통계 + Export |

---

## Categories (체크)

- 표 누락
- 계산표 누락
- 자료 누락
- 줄바꿈 이상
- 띄어쓰기
- OCR 오류
- 보기 오류
- 해설 이상
- Pattern 연결 이상
- 중복 문제
- 기타

카테고리 또는 메모 중 하나 이상 필요.

---

## Storage (append-only)

Key: `learning.problemReports.v1`

```json
{
  "schema": "learning.problemReports.v1",
  "nextSeq": 18,
  "items": [
    {
      "id": "QA-00017",
      "questionId": "ACC_2023_Q017",
      "pdf": "2023",
      "page": 17,
      "questionNo": 17,
      "year": 2023,
      "category": ["표 누락", "줄바꿈 이상"],
      "memo": "기말재고 표가 없음",
      "status": "Open",
      "patchTarget": "ACC_2023_Q017",
      "createdAt": "2026-07-26T00:00:00.000Z"
    }
  ]
}
```

### Rules

- **append-only** — 기존 레코드 수정·삭제 UI 없음
- `id` = `QA-#####` (seq)
- `patchTarget` = Question Patch Hook (현재 값만 저장, 패치 미구현)
- 초기 `status` = `Open`

---

## Export

Evidence Export와 **별도**.

| File | Format |
|------|--------|
| `problem-report-YYYYMMDD.json` | Machine import for `07_User_Research_Analyst` |
| `problem-report-YYYYMMDD.md` | Human review |

Export package fields:

- `schema`, `export_version`, `for_analyst`, `exported_at`
- `summary` — total / Open / Pending / Closed
- `reports` — full append-only list

진입: Settings → Problem Reports → Export 버튼

---

## Non-Goals

- QA 자동 분석
- AI Coach
- Question / Answer / Pattern DB 수정
- Recommendation / Mastery
- 레코드 상태 전이 UI (Closed/Pending은 필드·통계만 준비)

구현: `js/problem-report.js`
