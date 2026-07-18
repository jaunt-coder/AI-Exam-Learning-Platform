from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "source" / "original-exams"
ANSWERS_DIR = SOURCE_DIR / "answers"
DATA_DIR = ROOT / "data"
CACHE_DIR = DATA_DIR / "analysis" / "ocr-cache"

YEARS = list(range(2017, 2027))
ACC_START = 41
ACC_END = 80
EXPECTED_ACC_COUNT = ACC_END - ACC_START + 1

EXAM_ROUND = {
    2015: 26,
    2017: 28,
    2018: 29,
    2019: 30,
    2020: 31,
    2021: 32,
    2022: 33,
    2023: 34,
    2024: 35,
    2025: 36,
    2026: 37,
}

SUBJECT_LAW = "감정평가관계법규"
SUBJECT_ACC = "회계학"
CHOICE_SYMBOLS = ["①", "②", "③", "④", "⑤"]
QNUM_PATTERN = r"(?<![\d.])(4[1-9]|[1-6]\d|7[0-9]|80)\.(?!\d)"

CALC_KEYWORDS = [
    "￦", "×", "÷", "=", "계산", "금액", "원가", "매출원가", "당기순이익",
    "감가상각", "%,", "단가", "수량", "시간", "kg", "단위",
]

TABLE_KEYWORDS = [
    "일자", "적요", "수량", "단가", "구분", "기간", "액면가치", "시장이자율",
    "상환가치", "연금현재가치", "차변", "대변", "금액",
]
