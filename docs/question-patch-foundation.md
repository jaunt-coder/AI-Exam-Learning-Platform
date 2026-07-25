# Question Patch Foundation

Sprint-09A · WP-10  
Status: **HOOK ONLY** (not implemented)  
Date: 2026-07-26

---

## Purpose

Problem Report가 쌓이면 향후 **Question Patch Queue**로 연결한다.  
이번 Sprint는 패치를 적용하지 않는다. Hook 필드만 남긴다.

---

## Hook Field

Every Problem Report includes:

```json
{
  "id": "QA-00017",
  "questionId": "ACC_2023_Q017",
  "patchTarget": "ACC_2023_Q017"
}
```

| Field | Meaning |
|-------|---------|
| `questionId` | 보고 시점의 문제 ID |
| `patchTarget` | 향후 Patch System이 수정할 대상 (현재 = questionId) |

---

## Future (out of scope for 09A)

1. Analyst import (`problem-report.json`)
2. Human triage → status `Pending` / `Closed`
3. Patch draft against Question SoT (승인 후에만)
4. Promotion gate 통과 후 MVP 반영

이번 Sprint에서 **금지**:

- Question DB 직접 수정
- Parser / OCR 재수행
- 자동 패치 적용

---

## Related

- [problem-report-system.md](problem-report-system.md)
- [source-map-spec.md](source-map-spec.md)
- [sprint-09A-official-source-navigator.md](sprint-09A-official-source-navigator.md)
