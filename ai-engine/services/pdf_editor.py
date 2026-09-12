"""
In-place PDF text editing — replaces accepted redline suggestions directly
inside the original PDF's text layer (search -> redact -> reinsert), preserving
position and approximate font size/color instead of generating a new document.

Best-effort by nature: PyMuPDF can only find/replace text that has a real,
searchable text layer at that exact position, and inserted text always uses a
base-14 font (not the resume's original embedded font — exact font fidelity
is not attempted). PDFs where the resume text was rendered as outlines/images
will have 0 edits applied. A suggestion that can't be matched, or can't fit
even at the smallest allowed font size, is skipped rather than distorted or
overlapped onto neighboring lines — every failure degrades to "this one bullet
wasn't edited," never to a corrupted or visually broken document.
"""

import re
import fitz  # PyMuPDF

_START_FONT_SIZE_CAP = 11
_MIN_FONT_SIZE = 6
_PAGE_MARGIN = 36  # ~0.5in right boundary for reflowed text
_LINE_SPACING = 1.15


class PdfEditError(Exception):
    pass


def _candidates(original: str) -> list:
    base = original.strip()
    collapsed = re.sub(r"\s+", " ", base)
    debulleted = re.sub(r"^[•\-•●▪*–—]\s*", "", collapsed)
    ascii_norm = (
        debulleted.replace("‘", "'").replace("’", "'")
        .replace("“", '"').replace("”", '"')
        .replace("–", "-").replace("—", "-")
    )
    seen, out = set(), []
    for v in (base, collapsed, debulleted, debulleted.rstrip(".;,"), ascii_norm):
        if v and v not in seen:
            seen.add(v)
            out.append(v)
    return out


def _find_match(doc, original: str):
    """Returns (page, merged_rect) or (None, None)."""
    for page in doc:
        for cand in _candidates(original):
            quads = page.search_for(cand, quads=True)
            if quads:
                rect = fitz.Rect(quads[0].rect)
                for q in quads[1:]:
                    rect.include_rect(q.rect)
                return page, rect
    return None, None


def _dominant_span_style(page, rect):
    """Best-effort original font size/color for the text at rect."""
    try:
        d = page.get_text("dict", clip=rect)
        for block in d.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    return {"size": span.get("size", 10), "color": span.get("color", 0)}
    except Exception:
        pass
    return {"size": 10, "color": 0}


def _int_to_rgb(color_int):
    r = ((color_int >> 16) & 255) / 255
    g = ((color_int >> 8) & 255) / 255
    b = (color_int & 255) / 255
    return (r, g, b)


def _fit_fontsize(text, rect, start_size):
    """Only ever shrinks from start_size. Returns a fitting size, or None if it never fits."""
    size = min(start_size, _START_FONT_SIZE_CAP)
    while size >= _MIN_FONT_SIZE:
        # Rough line estimate via base-14 width, matching the font used at insert time.
        width = fitz.get_text_length(text, fontname="helv", fontsize=size)
        est_lines = max(1, int(width // max(rect.width, 1)) + 1)
        if est_lines * size * _LINE_SPACING <= rect.height:
            return size
        size -= 0.5
    return None


def apply_redlines_to_pdf(pdf_bytes: bytes, edits: list) -> dict:
    """
    edits: [{"original": str, "suggestion": str}, ...]
    Returns: {"pdf_bytes": bytes, "applied": [...], "skipped": [{"original", "reason"}]}
    Raises PdfEditError only for whole-document failures (corrupt/password-protected PDF).
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise PdfEditError(f"corrupt_or_invalid_pdf: {e}")

    if doc.needs_pass:
        doc.close()
        raise PdfEditError("password_protected")

    applied, skipped = [], []

    for edit in edits:
        original = (edit.get("original") or "").strip()
        suggestion = (edit.get("suggestion") or "").strip()
        if not original or not suggestion:
            skipped.append({"original": original, "reason": "empty_original_or_suggestion"})
            continue

        page, rect = _find_match(doc, original)
        if not rect:
            skipped.append({"original": original, "reason": "not_found_in_pdf_text_layer"})
            continue

        style = _dominant_span_style(page, rect)
        box = fitz.Rect(
            rect.x0, rect.y0,
            max(rect.x1, page.rect.x1 - _PAGE_MARGIN),
            rect.y1 + style["size"] * 4,
        )
        fontsize = _fit_fontsize(suggestion, box, style["size"])
        if fontsize is None:
            skipped.append({"original": original, "reason": "text_too_long_to_fit"})
            continue

        page.add_redact_annot(rect, fill=(1, 1, 1))
        page.apply_redactions()
        page.insert_textbox(
            box, suggestion, fontsize=fontsize, fontname="helv",
            color=_int_to_rgb(style["color"]), align=0,
        )
        applied.append({"original": original, "suggestion": suggestion, "page": page.number})

    out_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()
    return {"pdf_bytes": out_bytes, "applied": applied, "skipped": skipped}
