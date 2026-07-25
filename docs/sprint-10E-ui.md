# Sprint-10E — Dashboard UI

**Page:** `dashboard.html`  
**Controller:** `js/learning-dashboard-page.js`  
**Styles:** `css/learning-dashboard.css`

---

## Cards

1. **Today's Study** — Active Session, Remaining/Completed, Estimated Minutes, Strategy Type  
2. **Mastery Summary** — MASTERED / PROFICIENT / PRACTICING / LEARNING / RETRY_REQUIRED 개수  
3. **Weakness Summary** — 5 signal type 개수  
4. **Today's Plans** — Active only, Priority 내림차순 (Pattern / Action / Priority / Attempts)  
5. **Today's Strategies** — Pattern / Strategy Type / Status  
6. **Today's Session** — `12 / 30` · `40%` progress bar, 남은 문제, 예상 시간  

---

## Navigation

- `index.html` → Learning Dashboard 버튼  
- Dashboard header → 홈 / 학습 루프 / 문제 풀이 / 설정  

---

## Accessibility

- semantic `header` / `main` / `section` / `nav` / `footer`  
- progressbar ARIA (`aria-valuenow`)  
- `aria-live` status  
- keyboard-focusable nav links  

---

## Non-Goals

- Runtime mutation  
- AI recommendation  
- Question/Pattern/Master DB writes  
