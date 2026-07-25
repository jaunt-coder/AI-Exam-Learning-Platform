# Sprint-10E — Learning Dashboard

**Branch:** `feature/sprint-10E-learning-dashboard`  
**Service:** `js/dashboard-service.js`  
**Page:** `dashboard.html`

---

## Purpose

Runtime(Attempt→…→Study Session)은 수정하지 않고,  
LocalStorage 5종을 **읽기 전용**으로 모아 Learning Dashboard에 표시한다.

---

## Storage Sources

| Card | Key |
|------|-----|
| Today's Study / Session | `learning.session.v1` |
| Mastery Summary | `learning.mastery.v1` |
| Weakness Summary | `learning.weakness.v1` |
| Today's Plans | `learning.plan.v1` |
| Today's Strategies | `learning.strategy.v1` |

---

## API

| Function | Role |
|----------|------|
| `loadDashboard()` | Storage 로드 + summary |
| `buildDashboardSummary(stores)` | 카드 데이터 조립 |
| `calculateStudyProgress(session)` | `12 / 30` · `40%` |

---

## Mastery Display Mapping

| Runtime level | Dashboard bucket |
|---------------|------------------|
| MASTERED | MASTERED |
| DEVELOPING & accuracy ≥ 0.8 | PROFICIENT |
| DEVELOPING & accuracy < 0.8 | PRACTICING |
| LEARNING / UNKNOWN | LEARNING |
| RETRY_REQUIRED | RETRY_REQUIRED |

---

## Contract

```json
{
  "dashboardContract": {
    "enabled": true,
    "schemaVersion": "v1",
    "connected": true
  }
}
```
