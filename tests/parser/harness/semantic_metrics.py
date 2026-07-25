"""Stage 6.8 semantic metrics — aggregate SemanticReport / meta_semantic."""
from __future__ import annotations


def aggregate_semantic(meta_list: list[dict]) -> dict:
    """Aggregate per-year meta_semantic dicts into overall metrics."""
    if not meta_list:
        return {
            "semanticScore": None,
            "semanticViolationCount": 0,
            "semanticErrorCount": 0,
            "headerValidationAccuracy": None,
            "numericContextAccuracy": None,
            "blankCellRatio": None,
            "orphanTokenCount": 0,
            "tableConsistencyScore": None,
            "choiceAccuracy": None,
            "orphanRepairs": 0,
        }

    def _mean(key):
        vals = [m[key] for m in meta_list if m.get(key) is not None]
        return round(sum(vals) / len(vals), 4) if vals else None

    # document scores are 0..100 — normalize to 0..1 for harness consistency
    scores = [m["documentScore"] / 100.0 for m in meta_list if m.get("documentScore") is not None]
    return {
        "semanticScore": round(sum(scores) / len(scores), 4) if scores else None,
        "semanticScore100": round(sum(m["documentScore"] for m in meta_list) / len(meta_list), 2),
        "semanticViolationCount": sum(m.get("violationCount", 0) for m in meta_list),
        "semanticErrorCount": sum(m.get("errorCount", 0) for m in meta_list),
        "semanticWarnCount": sum(m.get("warnCount", 0) for m in meta_list),
        "headerValidationAccuracy": _mean("headerValidationAccuracy"),
        "numericContextAccuracy": _mean("numericContextAccuracy"),
        "blankCellRatio": _mean("blankCellRatioMean"),
        "orphanTokenCount": sum(m.get("orphanTokenCount", 0) for m in meta_list),
        "tableConsistencyScore": _mean("tableConsistencyMean"),
        "choiceAccuracy": _mean("choiceAccuracy"),
        "orphanRepairs": sum(m.get("orphanRepairs", 0) for m in meta_list),
    }


def score_from_reports(reports: list) -> dict:
    """Build metrics from a list of SemanticReport objects."""
    if not reports:
        return aggregate_semantic([])
    scores = [r.score for r in reports]
    errors = sum(1 for r in reports for v in r.violations if v.severity == "error")
    warns = sum(1 for r in reports for v in r.violations if v.severity == "warn")
    table_r = [r for r in reports if r.has_table]
    return {
        "semanticScore": round(sum(scores) / len(scores) / 100.0, 4),
        "semanticScore100": round(sum(scores) / len(scores), 2),
        "semanticViolationCount": errors + warns,
        "semanticErrorCount": errors,
        "semanticWarnCount": warns,
        "headerValidationAccuracy": round(
            sum(1 for r in reports if r.header_ok) / len(reports), 4
        ),
        "numericContextAccuracy": round(
            sum(1 for r in reports if r.numeric_context_ok) / len(reports), 4
        ),
        "blankCellRatio": (
            round(sum(r.blank_cell_ratio for r in table_r) / len(table_r), 4) if table_r else 0.0
        ),
        "orphanTokenCount": sum(r.orphan_token_count for r in reports),
        "tableConsistencyScore": (
            round(sum(r.table_consistency for r in table_r) / len(table_r), 4) if table_r else 1.0
        ),
        "choiceAccuracy": round(sum(1 for r in reports if r.choice_ok) / len(reports), 4),
    }
