from __future__ import annotations

import re

PATTERN_RULES: list[tuple[str, list[str], str, str]] = [
    ("ACC_INV_001", ["FOB", "선적", "도착지", "운송 중", "기말재고에 포함"], "ACC_INV", "기말재고 포함 여부 판단"),
    ("ACC_INV_002", ["CIF", "FOB 조건"], "ACC_INV", "FOB/CIF 조건에 따른 재고 귀속"),
    ("ACC_INV_003", ["운반", "하역", "보험료", "부대비용", "매입할인"], "ACC_INV", "운반비·부대비용과 재고원가"),
    ("ACC_INV_004", ["매출원가", "PER(", "PER법", "실지재고", "재고조사법"], "ACC_INV", "매출원가 계산 (PER법)"),
    ("ACC_INV_006", ["선입선출", "FIFO", "가중평균", "이동평균", "총평균"], "ACC_INV", "FIFO·총평균법 매출원가"),
    ("ACC_INV_007", ["순실현", "LCM", "저가", "소매재고", "순매가"], "ACC_INV", "LCM·순실현가능가치 평가"),
    ("ACC_INV_008", ["재고자산에 관한", "재고자산의 정의"], "ACC_INV", "재고자산 개념·회계처리"),
    ("ACC_PPE_001", ["유형자산", "감가상각", "내용연수", "잔존가치"], "ACC_PPE", "유형자산·감가상각"),
    ("ACC_PPE_002", ["재평가", "공정가치", "손상", "회수가능액"], "ACC_PPE", "재평가·손상"),
    ("ACC_INT_001", ["무형자산", "개발비", "상각", "비한정"], "ACC_INT", "무형자산"),
    ("ACC_FIN_001", ["금융자산", "금융부채", "상각후원가", "공정가치"], "ACC_FIN", "금융상품"),
    ("ACC_FIN_002", ["사채", "전환사채", "회사채", "사채할인", "내재이자율"], "ACC_FIN", "사채·채권"),
    ("ACC_REV_001", ["수익인식", "매출", "고객과의 계약"], "ACC_REV", "수익인식"),
    ("ACC_TAX_001", ["법인세", "이연법인세", "과세소득"], "ACC_TAX", "법인세"),
    ("ACC_EQ_001", ["주식", "배당", "자본", "우선주", "보통주"], "ACC_EQ", "자본·배당"),
    ("ACC_COST_001", ["원가계산", "제조원가", "변동원가", "종합원가", "원가흐름"], "ACC_COST", "원가계산"),
    ("ACC_COST_002", ["활동기준", "ABC", "제약이론", "EVA", "잔여이익"], "ACC_COST", "관리회계"),
    ("ACC_CFS_001", ["현금흐름", "영업활동", "투자활동", "재무활동"], "ACC_CFS", "현금흐름"),
    ("ACC_FS_001", ["재무제표", "표시", "개념체계", "표현충실성", "인식", "측정"], "ACC_FS", "재무제표 일반"),
    ("ACC_LEASE_001", ["리스", "사용권자산", "리스부채"], "ACC_LEASE", "리스"),
    ("ACC_GEN_001", ["회계", "분개", "장부", "재무상태표", "손익"], "ACC_GEN", "회계학 일반"),
]

PATTERN_NAMES = {rule[0]: rule[3] for rule in PATTERN_RULES}


def classify_pattern(text: str) -> tuple[str, str]:
    for pattern_id, keywords, chapter_id, _name in PATTERN_RULES:
        if any(keyword in text for keyword in keywords):
            return pattern_id, chapter_id
    return "ACC_GEN_001", "ACC_GEN"


def pattern_grade(frequency: int) -> str:
    if frequency >= 4:
        return "S"
    if frequency >= 2:
        return "A"
    return "B"
