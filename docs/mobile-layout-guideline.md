# Mobile Layout Guideline

Sprint-08 · WP-06 · WP-10  
Status: **ACTIVE**  
Date: 2026-07-26

---

## Breakpoints

| Range | Behavior |
|-------|----------|
| ≤768px (Mobile) | 1 column · Sidebar 기본 hidden · buttons full width |
| 769–1023px (Tablet) | 1 column flow · Dashboard 기본 collapse |
| ≥1024px (Desktop) | 2 column flow · Dashboard 기본 open · collapse 가능 |

---

## Dashboard Collapse

| Device | Default | User |
|--------|---------|------|
| Desktop | Expanded | 접기/펼치기 |
| Tablet | Collapsed | 펼치기 가능 |
| Mobile | Hidden (side col) | 펼치기 시 표시 |

학습 중(`#screen-flow`)에만 Dashboard를 펼친다.  
Today's Study에는 compact Session Progress만 둔다.

---

## Touch

- Primary controls: `min-height` / `min-width` **≥ 44px** (`.button--touch`)
- Mobile: Start / Next / Finish 등 **width 100%**
- Choice rows: min-height 44px

---

## Spacing

- Mobile card padding ≈ `1rem`
- Section gap ≈ `1rem`
- Avoid stacked duplicate progress cards

---

## Flow Actions

- Hidden until Question (and later stages)
- Full-width stack on ≤768px

---

## Checklist

- [ ] 한 손으로 Start 가능
- [ ] Preview → Mode → Start 스크롤이 자연스러움
- [ ] Sidebar가 Question을 가리지 않음
- [ ] Export는 Session Summary에서만
