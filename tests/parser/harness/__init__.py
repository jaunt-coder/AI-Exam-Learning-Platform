"""Phase 0 Regression Harness.

The harness is an INDEPENDENT measuring stick used to compare parser output
against the source of truth (source/original-exams/). Its metric definitions are
intentionally self-contained so they do not drift while the parser engine is
refactored across Phase 1~6.

Read-only dependency on the current pipeline:
    - exam_pipeline.source_loader.load_exam_document  (raw PDF/HWP/OCR extraction)

Everything else (segmentation, tokenization, metric math) is implemented here.
"""
