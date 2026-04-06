"""
PDF parsing module — extracts structured text from uploaded resumes.
Uses PyMuPDF (fitz) for layout-aware extraction and pdfplumber as fallback.
"""

import re
import fitz  # PyMuPDF
import pdfplumber
from pathlib import Path


def _clean_text(text: str) -> str:
    """Normalize whitespace and remove control characters."""
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()


def extract_text_from_bytes(pdf_bytes: bytes) -> dict:
    """
    Extract text from PDF bytes.
    Returns: { "text": str, "pages": int, "lines": list[str] }
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        full_text = ""
        for page in doc:
            # sort blocks top-to-bottom, left-to-right for reading order
            blocks = page.get_text("blocks")
            blocks.sort(key=lambda b: (round(b[1] / 10), b[0]))
            page_text = "\n".join(b[4].strip() for b in blocks if b[4].strip())
            full_text += page_text + "\n"
        doc.close()

        text = _clean_text(full_text)
        lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
        return {"text": text, "pages": len(doc), "lines": lines, "method": "pymupdf"}

    except Exception:
        # Fallback: pdfplumber
        import io
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                t = page.extract_text(x_tolerance=2, y_tolerance=2)
                if t:
                    pages_text.append(t)
            text = _clean_text("\n".join(pages_text))
            lines = [ln.strip() for ln in text.split('\n') if ln.strip()]
            return {"text": text, "pages": len(pdf.pages), "lines": lines, "method": "pdfplumber"}


def extract_text_from_path(pdf_path: str) -> dict:
    """Extract text from a file path."""
    with open(pdf_path, "rb") as f:
        return extract_text_from_bytes(f.read())


def detect_sections(text: str) -> dict:
    """
    Heuristically detect resume sections.
    Returns dict: section_name -> content
    """
    section_patterns = {
        "education":    r"(?i)(education|academic|qualification)",
        "experience":   r"(?i)(experience|employment|work history|internship)",
        "projects":     r"(?i)(project|portfolio|work sample)",
        "skills":       r"(?i)(skill|technology|tech stack|expertise|competenc)",
        "certifications": r"(?i)(certif|award|achiev|honor|accomplishment)",
        "summary":      r"(?i)(summary|objective|profile|about)",
        "contact":      r"(?i)(contact|email|phone|linkedin|github)",
    }

    lines = text.split('\n')
    sections: dict[str, list[str]] = {}
    current = "other"

    for line in lines:
        for sec, pattern in section_patterns.items():
            if re.search(pattern, line) and len(line.split()) <= 6:
                current = sec
                sections.setdefault(current, [])
                break
        else:
            sections.setdefault(current, [])
            sections[current].append(line)

    return {k: "\n".join(v).strip() for k, v in sections.items() if v}


def count_metrics(text: str) -> dict:
    """Count quantifiable metrics in the resume."""
    percentage_pattern = r'\d+(\.\d+)?%'
    number_pattern = r'\b\d{2,}\b'
    dollar_pattern = r'\$[\d,]+[KMB]?'
    rupee_pattern = r'₹[\d,]+[KLCr]?'

    return {
        "percentages": len(re.findall(percentage_pattern, text)),
        "numbers": len(re.findall(number_pattern, text)),
        "currency": len(re.findall(dollar_pattern + '|' + rupee_pattern, text)),
        "total_metrics": len(re.findall(
            percentage_pattern + '|' + dollar_pattern + '|' + rupee_pattern, text
        )),
    }


WEAK_VERB_PATTERN = re.compile(
    r'\b(responsible for|worked on|helped|made|did|was involved in|'
    r'assisted|participated|contributed to|part of|tasked with|'
    r'tried to|attempted|basically|just)\b',
    re.IGNORECASE
)


def find_weak_verbs(lines: list[str]) -> list[dict]:
    """Return list of {line_index, original, verb} for weak-verb bullets."""
    found = []
    for i, line in enumerate(lines):
        for match in WEAK_VERB_PATTERN.finditer(line):
            found.append({
                "line_index": i,
                "original": line.strip(),
                "verb": match.group(),
            })
    return found
