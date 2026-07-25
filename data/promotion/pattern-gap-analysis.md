# Pattern Gap Evidence Collection

Generated: 2026-07-20T14:36:03Z
Mode: **Evidence only — no reclassification, no DB writes**
Gap patternId: `ACC_COST_001`
Candidate source: `data/promotion/candidate-question-db.json`
Product baseline: `data/question-db-mvp.json`
Pattern Master: `data/pattern-db-mvp.json`

---

## 1. Pattern Master Snapshot (D4)

- Registered patternId count: **17**
- Gap id registered?: **NO**

### ACC_COST* entries currently registered

| patternId | name | chapterId |
|---|---|---|
| `ACC_COST_002` | 관리회계 | `ACC_COST` |

### Full registered patternId list

`ACC_COST_002`, `ACC_EQ_001`, `ACC_FIN_001`, `ACC_FIN_002`, `ACC_FS_001`, `ACC_GEN_001`, `ACC_INT_001`, `ACC_INV_001`, `ACC_INV_003`, `ACC_INV_004`, `ACC_INV_006`, `ACC_INV_007`, `ACC_LEASE_001`, `ACC_PPE_001`, `ACC_PPE_002`, `ACC_REV_001`, `ACC_TAX_001`

---

## 2. Gap Records Evidence

Total gap records: **15**

| # | questionId | year | emit.patternId | mvp.patternId | emit.chapterId | mvp.chapterId | answer(emit=mvp) | sourceFile | page |
|---:|---|---:|---|---|---|---|---|---|---:|
| 1 | `ACC_2015_Q073` | 2015 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 1 ✓ | `source/original-exams/2015.pdf` | 27 |
| 2 | `ACC_2017_Q072` | 2017 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 2 ✓ | `source/original-exams/2017.pdf` | 26 |
| 3 | `ACC_2017_Q074` | 2017 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 4 ✓ | `source/original-exams/2017.pdf` | 27 |
| 4 | `ACC_2017_Q079` | 2017 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 3 ✓ | `source/original-exams/2017.pdf` | 29 |
| 5 | `ACC_2018_Q072` | 2018 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 1 ✓ | `source/original-exams/2018.pdf` | 25 |
| 6 | `ACC_2018_Q073` | 2018 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 3 ✓ | `source/original-exams/2018.pdf` | 25 |
| 7 | `ACC_2018_Q077` | 2018 | `ACC_COST_001` | `ACC_COST_002` | `ACC_COST` | `ACC_COST` | 2 ✓ | `source/original-exams/2018.pdf` | 27 |
| 8 | `ACC_2018_Q078` | 2018 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 5 ✓ | `source/original-exams/2018.pdf` | 27 |
| 9 | `ACC_2020_Q071` | 2020 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 2 ✓ | `source/original-exams/2020.pdf` | 25 |
| 10 | `ACC_2020_Q075` | 2020 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 5 ✓ | `source/original-exams/2020.pdf` | 27 |
| 11 | `ACC_2024_Q074` | 2024 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 4 ✓ | `source/original-exams/2024.pdf` | 25 |
| 12 | `ACC_2025_Q075` | 2025 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 5 ✓ | `source/original-exams/2025.pdf` | 25 |
| 13 | `ACC_2025_Q076` | 2025 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 4 ✓ | `source/original-exams/2025.pdf` | 26 |
| 14 | `ACC_2025_Q078` | 2025 | `ACC_COST_001` | `ACC_GEN_001` | `ACC_COST` | `ACC_GEN` | 2 ✓ | `source/original-exams/2025.pdf` | 26 |
| 15 | `ACC_2025_Q080` | 2025 | `ACC_COST_001` | `ACC_COST_002` | `ACC_COST` | `ACC_COST` | 1 ✓ | `source/original-exams/2025.pdf` | 27 |

## 3. Per-question Stem Evidence

각 항목은 Emit stem 미리보기와 Product(MVP) stem 미리보기만 제시한다. 재분류 추천은 하지 않는다.

### `ACC_2015_Q073`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`1` mvp=`1`
- source: `source/original-exams/2015.pdf` page=27 questionNumber=73

**Emit stem (preview)**

```
73 주감평은 년생산량은 20×5 단위이다판매가격및 . 전부원가계산방법으로 원가계산방법으로계산한영업이익에비해얼마 만큼증가또는감소하는가 과기말재공품은없다.) ○단위당판매가격 ○단위당변동제조 ○단위당변동판매비와관리비 ○고정제조간접 ○고정판매비와관리비 400,000
```

**MVP stem (preview)**

```
주감평 은 생활용품 을 생산 판매하고 있다. ㆍ 년생산량 은 단위 이고판매량 은 1,200 1,000 20×5 단위 이다판매 가격 및원 가자료 는다음 과같다.. 전부원 가계산방법 으 로 계산한 영업 이익 은 변동 원 가계산방법 으 로계산한영업 이익 에비해얼마 만큼증 가또 는감소 하 는 가 단 기초재고자산 ? (, 과기말재공품 은 없다.) ○단위당판매 가격 8,000W ○단위당변동제조원 가 3,000 ○단위당변동판매비 와관리비 1,500 ○고정제조간접원 가 2,400,000 ○고정판매비 와관리비 …
```

### `ACC_2017_Q072`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`2` mvp=`2`
- source: `source/original-exams/2017.pdf` page=26 questionNumber=72

**Emit stem (preview)**

```
72표준원가계산제도를채택하고있는(주)대한의20x1년도 직접노무원가와관련된 자료는다음과 같다. 20x1년도의실제생산량은? 직접노무원가실제발생액 ￦385,700 직접노무원가 능률차이 ￦14,000 직접노무원가 임률차이 ￦20,300
```

**MVP stem (preview)**

```
표준원 가계산제 도 를채택하고있 는 (주) 대한 의20×1년도직접노무원 가 와관련된 자료 는다음 과같다. 20×1년도 의실제생산량 은? 실제직접노무시간 101,500시간 직접노무원 가실제발생액 W385,700 직접노무원 가능률차 이 W14,000(유리) 직접노무원 가임률차 이 W20,300(유리) 단위당표준직접노무시간 2시간
```

### `ACC_2017_Q074`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`4` mvp=`4`
- source: `source/original-exams/2017.pdf` page=27 questionNumber=74

**Emit stem (preview)**

```
74(주)대한은 펌프사업부와 밸브사업부를이익중심점으로운영하고있다. 밸브 사업부는 X제품을생산하며, X제품의단위당 판매가격과단위당변동원가는 각각￦100과 ￦40이고, 단위당고정원가는 ￦20이다. 펌프사업부는연초에 Y제품을개발했으며, Y제품을생산하는데 필요한A부품은외부업체로부터 단위당 ￦70에구입할수있다. 펌프사업부는A부품 500단위를 밸브사업부로부터 대체받는것을고려하고있다. 밸브사업부가A부품 500단위를생산및대체하기 위해서는단위당변동제조원가 ￦30과단위당운송비 ￦7이발생하며, 기존 시장에서 X제품…
```

**MVP stem (preview)**

```
(주) 대한 은펌프사업부 와밸브사업부 를 이익중심점 으 로운영하고 있다. 밸브 사업부 는X제품 을생산 하며, X제품 의단위당판매 가격 과단위당변동원 가 는 각각W100과W40이고, 단위당고정원 가 는W20이다. 펌프사업부 는연초 에 Y제품 을개발했으며, Y제품 을생산 하 는데필요한A부품 은외부업체 로 부터 단위당W70에구입할수 있다. 펌프사업부 는A부품500단위 를밸브사업부 로 부터 대체받 는 것 을고려하고 있다. 밸브사업부 가A부품500단위 를생산 및대체 하기 위해서 는단위당변동제조원 가W30…
```

### `ACC_2017_Q079`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`3` mvp=`3`
- source: `source/original-exams/2017.pdf` page=29 questionNumber=79

**Emit stem (preview)**

```
79(주)감평은A제품을생산ㆍ판매하고있다. 20x1년에는기존고객에게9,000단위를 판매할것으로 예상되며, A제품 관련자료는다음과 같다. 단위당 판매가격 ￦2,000 단위당변동제조원가 ￦1,000 ￦200 연간 총고정제조원가 ￦2,500,000 20x1년중에(주)감평은새로운고객인(주)대한으로부터A제품 2,000단위를 구매하겠다는특별주문을제안받았다. 특별주문을수락하면기존고객에대한 판매량 중1,000단위를감소시켜야하며, 특별주문에대해서는단위당변동판매비 ￦200이발생하지않는다. (주)감평이특별주문으로부터…
```

**MVP stem (preview)**

```
(주) 감평 은A제품 을생산ㆍ판매하고 있다. 20×1년에 는기존고객 에게9,000단위 를 판매할 것 으 로예상되며, A제품관련자료 는다음 과같다. 연간최대생산량 10,000단위 단위당판매 가격 W2,000 단위당변동제조원 가 W1,000 단위당변동판매비 W200 연간총고정제조원 가 W2,500,000 20×1년중 에 (주) 감평 은새 로운고객인 (주) 대한 으 로 부터A제품2,000단위 를 구매하겠다 는특별주문 을제안받았다. 특별주문 을수락 하면기존고객 에대한 판매량중1,000단위 를감소시켜야 …
```

### `ACC_2018_Q072`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`1` mvp=`1`
- source: `source/original-exams/2018.pdf` page=25 questionNumber=72

**Emit stem (preview)**

```
72 원가가산가격결정방법에의해서판매가격을결정하는경우( )에들어갈 금액으로옳은것은? (단, 영업이익은 총원가의30%이고, 판매비와관리비는 제조원가의50%이다.) 영업이익 (ㅁ) 판매가격 ￦58,500 판매비와관리비 (ㄷ) 총원가 (ㅂ) 제조간접원가 (ㄱ) 제조원가 (ㄹ) 직접재료원가 ￦12,500 기초원가 (ㄴ) 직접노무원가 ￦12,500 (ㄱ) (ㄴ) (ㄷ) (ㄹ) (ㅁ) (ㅂ)
```

**MVP stem (preview)**

```
원 가 가산 가격결정방법 에 의해서판매 가격 을결정 하 는 경우 에들어갈 금액 으 로옳 은 것 은? (단, 영업 이익 은총원 가 의30%이고, 판매비 와관리비 는 제조원 가 의50%이다.) 영업 이익 (ㅁ) 판매 가격 W58,500 판매비 와관리비 (ㄷ) 총원 가 (ㅂ) 제조간접원 가 (ㄱ) 제조원 가 (ㄹ) 직접재료원 가 W12,500 기초원 가 (ㄴ) 직접노무원 가 W12,500 (ㄱ) (ㄴ) (ㄷ) (ㄹ) (ㅁ) (ㅂ)
```

### `ACC_2018_Q073`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`3` mvp=`3`
- source: `source/original-exams/2018.pdf` page=25 questionNumber=73

**Emit stem (preview)**

```
73실제개별원가계산제도를사용하는(주)감평의20x1년도연간실제원가는다음 과 같다. 직접재료원가 ￦4,000,000 직접노무원가 ￦5,000,000 제조간접원가 ￦1,000,000 (주)감평은20x1년중 작업지시서 #901을수행하였는데 이 작업에320시간의 직 접노무시간이 투입되었다. (주)감평은제조간접원가를 직접노무시간을기준으로 실제배부율을사용하여 각작업에배부한다. 20x1년도실제 총직접노무시간은 2,500시간이다. (주)감평이 작업지시서 #901에배부하여야할제조간접원가는?
```

**MVP stem (preview)**

```
실제개별원 가계산제 도 를사용 하 는 (주) 감평 의20×1년도연간실제원 가 는다음 과같다. 직접재료원 가 W4,000,000 직접노무원 가 W5,000,000 제조간접원 가 W1,000,000 (주) 감평 은20×1년중작업지시서#901을수행 하였 는데 이작업 에320시간 의직 접노무시간 이투입되었다. (주) 감평 은제조간접원 가 를직접노무시간 을기준 으 로 실제배부율 을사용 하여각작업 에배부한다. 20×1년도실제총직접노무시간 은 2,500시간 이다. (주) 감평 이작업지시서#901에배부 하여야…
```

### `ACC_2018_Q077`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_COST_002`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_COST`
- answer: emit=`2` mvp=`2`
- source: `source/original-exams/2018.pdf` page=27 questionNumber=77

**Emit stem (preview)**

```
77다음은 활동기준원가계산을사용하는제조기업인(주)감평의20x1년도연간 활동원가예산자료이다. 20x1년에회사는제품A를1,000단위 생산하였는데 제품A의 생산을위한 활동원가는￦830,000으로 집계되었다. 제품A의 생산 을위해서20x1년에80회의재료이동과300시간의 직접노동시간이소요되었 다. (주)감평이제품A를 생산하는과정에서발생한기계작업시간은? 연간 활동원가예산자료 활동원가 원가동인 원가동인총수량 ￦4,000,000 ￦3,000,000 ￦1,500,000 ￦1,000,000
```

**MVP stem (preview)**

```
다음 은활동기준원 가계산 을사용 하 는제조기업인 (주) 감평 의20×1년도연간 활동원 가예산자료 이다. 20×1년에회사 는제품A를1,000단위생산 하였 는데 제품A의생산 을위한활동원 가 는W830,000으 로집계되었다. 제품A의생산 을위해서20×1년에 80회 의재료 이동 과300시간 의직접노동시간 이소요되었 다. (주) 감평 이제품A를생산 하 는 과정 에서발생한기계작업시간 은? 연간활동원 가예산자료 활동 활동원 가 원 가동인 원 가동인총수량 재료 이동 W4,000,000 이동횟수 1,000회 성…
```

### `ACC_2018_Q078`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`5` mvp=`5`
- source: `source/original-exams/2018.pdf` page=27 questionNumber=78

**Emit stem (preview)**

```
78(주)감평은세종류의제품A, B, C를 독점생산및판매하고있다. 제품생산 을위해사용되는공통설비의연간사용시간은 총 40,000시간으로제한되어 있다. 20x1년도예상자료는다음과 같다. 다음설명중옳은것은? ￦500 ￦750 ￦1,000 단위당변동원가 ￦150 ￦300 ￦600
```

**MVP stem (preview)**

```
(주) 감평 은세종류 의제품A, B, C를독점생산 및판매하고 있다. 제품생산 을위해사용되 는공통설비 의연간사용시간 은총40,000시간 으 로제한되어 있다. 20×1년도예상자료 는다음 과같다. 다음설명중옳 은 것 은? 구분 제품A 제품B 제품C 단위당판매 가격 W500 W750 W1,000 단위당변동원 가 W150 W300 W600 단위당공통설비사용시간 5시간 10시간 8시간 연간최대시장수요량 2,000단위 3,000단위 2,000단위
```

### `ACC_2020_Q071`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`2` mvp=`2`
- source: `source/original-exams/2020.pdf` page=25 questionNumber=71

**Emit stem (preview)**

```
71(주)감평의20x1년기초 및기말 재고자산은다음과 같다. 기 초 기 말 ￦10,000 ￦15,000 재공 품 (주)감평은20x1년중 직접재료 ￦35,000을매입하였고, 직접노무원가 ￦45,000을 지급하였으며, 제조간접원가 ￦40,000이발생하였다. (주)감평의20x1년당기제품 제조원가는? (단, 20x1년 초직접노무원가선급금액은 ￦15,000이고20x1년 말 직접노무원가미지급금액은 ￦20,000이다.)
```

**MVP stem (preview)**

```
(주) 감평 의20×1년기초 및기말재고자산 은다음 과같다. 구분 기 초 기 말 직접재료 W10,000 W15,000 재공품 40,000 50,000 제 품 40,000 55,000 (주) 감평 은20×1년중직접재료W35,000을매입 하였고, 직접노무원 가W45,000을 지급 하였으며, 제조간접원 가W40,000이발생 하였다. (주) 감평 의20×1년당기제품 제조원 가 는?
```

### `ACC_2020_Q075`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`5` mvp=`5`
- source: `source/original-exams/2020.pdf` page=27 questionNumber=75

**Emit stem (preview)**

```
75(주)감평은 표준원가계산제도를 채택하고 있다. 20x1년 직접노무원가와 관련된 자료가다음과 같을경우, 20x1년실제 직접노무시간은? ○ 직접노무원가실제임률 ○ 직접노무원가 표준임률 ○ 표준 직접노무시간 ○ 직접노무원가임률차이 ○ 직접노무원가 능률차이 ￦10 ￦12 ￦110,000 ￦60,000
```

**MVP stem (preview)**

```
(주) 감평 은 표준원 가계산제 도 를 채택하고 있다. 20×1년 직접노무원 가 와 관련된 자료 가다음 과같 을 경우, 20×1년실제직접노무시간 은? ○실제생산량 ○직접노무원 가실제임률 ○직접노무원 가표준임률 ○표준직접노무시간 ○직접노무원 가임률차 이 ○직접노무원 가능률차 이 25,000단위 시간당W10 시간당W12 단위당 2시간 W110,000(유리) W60,000(불리)
```

### `ACC_2024_Q074`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`4` mvp=`4`
- source: `source/original-exams/2024.pdf` page=25 questionNumber=74

**Emit stem (preview)**

```
74(주)감평은20×1년 초영업을개시하였으며, 표준원가계산제도를채택하고있다. 직접 재료 kg당실제구입가격은 ￦5, 제품 단위당 직접재료표준원가는 ￦6(2kg×￦3/kg) 이다. 직접재료원가에대한 차이분석결과구입가격차이가 ￦3,000(불리), 능률차이가 ￦900(유리)이다. 20×1년실제제품 생산량이800단위일때, 기말 직접재료재고수량 은? (단, 기말재공품은없다.)
```

**MVP stem (preview)**

```
(주) 감평 은20×1년초영업 을개시 하였으며, 표준원 가계산제 도 를채택하고 있다. 직접 재료kg당실제구입 가격 은W5, 제품단위당직접재료표준원 가 는W6(2kg×W3/kg) 이다. 직접재료원 가 에대한차 이분석결 과구입 가격차 이 가W3,000(불리), 능률차 이 가 W900(유리) 이다. 20×1년실제제품생산량 이800단위일 때, 기말직접재료재고수량 은? (단, 기말재공품 은 없다.)
```

### `ACC_2025_Q075`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`5` mvp=`5`
- source: `source/original-exams/2025.pdf` page=25 questionNumber=75

**Emit stem (preview)**

```
75(주)감평은표준원가계산제도를채택하고있다. 20×1년 직접재료원가의표준원가 와실제원가의차이에관한자료는다음과같다. ￦160 제품단위당 직접재료표준투입량 직접재료원가가격차이 ￦48,500 직접재료원가 총차이 (주)감평의20×1년실제제품생산량은?
```

**MVP stem (preview)**

```
(주) 감평 은표준원 가계산제 도 를채택하고 있다. 20×1년직접재료원 가 의표준원 가 와실제원 가 의차 이 에관한자료 는다음 과같다. 직접재료실제사용량 4,850 kg 직접재료단위당실제구입 가격 W160 제품단위당직접재료표준투입량 2 kg 직접재료원 가 가격차 이 W48,500 (불리) 직접재료원 가총차 이 26,000 (불리) (주) 감평 의20×1년실제제품생산량 은?
```

### `ACC_2025_Q076`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`4` mvp=`4`
- source: `source/original-exams/2025.pdf` page=26 questionNumber=76

**Emit stem (preview)**

```
76전부원가계산, 변동원가계산및초변동원가계산에관한설명으로옳지않은것은?
```

**MVP stem (preview)**

```
전부원 가계산, 변동원 가계산 및초변동원 가계산 에관한설명 으 로옳지않 은 것 은?
```

### `ACC_2025_Q078`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_GEN_001`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_GEN`
- answer: emit=`2` mvp=`2`
- source: `source/original-exams/2025.pdf` page=26 questionNumber=78

**Emit stem (preview)**

```
78(주)감평은20×1년에 영업을개시하였으며, 실제원가계산을적용하고있다. 20×1년 생산및판매에관한자료는다음과같다. 단위당변동제조원가 ￦150 고정제조간접원가 ￦200,000 (주)감평의20×1년전부원가계산하에서의손익분기점판매량은?
```

**MVP stem (preview)**

```
(주) 감평 은20×1년에영업 을개시 하였으며, 실제원 가계산 을적용하고 있다. 20×1년 생산 및판매 에관한자료 는다음 과같다. 생산량 5,000단위 판매량 4,800단위 단위당변동제조원 가 W150 고정제조간접원 가 W200,000 단위당변동판매관리비 20 고정판매관리비 110,000 단위당판매 가격 250 (주) 감평 의20×1년전부원 가계산하 에서 의손익분기점판매량 은?
```

### `ACC_2025_Q080`

- emit.patternId: `ACC_COST_001`
- mvp.patternId: `ACC_COST_002`
- emit.chapterId: `ACC_COST` / mvp.chapterId: `ACC_COST`
- answer: emit=`1` mvp=`1`
- source: `source/original-exams/2025.pdf` page=27 questionNumber=80

**Emit stem (preview)**

```
80전략적관리회계기법에관한내용으로옳은것을모두고른것은? ㄱ. 제약이론(theory of constraints)은기업의목표를 달성하는과정에서 병목 공정을 파악하여 집중적으로관리하고개선해서기업의성과를높이는방 법이다. ㄴ. 품질원가(cost of quality)에서예방원가와평가원가를포함하는통제원가 는 불량품의발생률과역의관계를 갖는다. ㄷ. 활동기준경영(activity based management)에서활동분석을통하여 파악된 비부가가치활동은 검사, 이동, 대기및저장등의활동이있다. ㄹ. 적시생산시스템(ju…
```

**MVP stem (preview)**

```
전략적관리회계기법 에관한내용 으 로옳 은 것 을모두고른 것 은? ㄱ. 제약 이론 (theory of constraints) 은기업 의목표 를달성 하 는 과정 에서병목 공정 을파악 하여집중적 으 로관리하고개선해서기업 의성 과 를높 이 는방 법 이다. ㄴ. 품질원 가 (cost of quality) 에서예방원 가 와평 가원 가 를포함 하 는통제원 가 는불량품 의발생률 과역 의관계 를갖 는다. ㄷ. 활동기준경영 (activity based management) 에서활동분석 을통 하여파악된 비부 가 가…
```

---

## 4. Observed Facts (no judgment)

1. Emit assigns unresolved id `ACC_COST_001` to 15 questions.
2. Pattern Master does **not** currently contain `ACC_COST_001`.
3. Product(MVP) patternIds for the same questions: `ACC_COST_002`, `ACC_GEN_001`.
4. Answer values for all gap rows match Product baseline (see table).
5. Final disposition (register / re-map / classifier revisit) is **Human Approval only**.

---

## 5. Human Approval

Cursor는 아래를 채우지 않는다.

```
[ ] REGISTER `ACC_COST_001` into Pattern DB (requires D4 schema approval)
[ ] RE-MAP emit outputs to an existing registered patternId: _______________
[ ] REVISIT emit classifier / orthogonal pattern service (no Product overwrite)
[ ] DEFER

승인자: _______________
일자: _______________
```

