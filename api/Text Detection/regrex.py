# pii_regex.py
import re

# Regex patterns for structured PII
PII_PATTERNS = {
    "Email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
    "Mobile Number": r"\b(?:\+91[-\s]?|0)?[6-9]\d{9}\b", 
    "Date of Birth": r"\b(?:0?[1-9]|[12][0-9]|3[01])[-/.\s]?(?:0?[1-9]|1[0-2])[-/.\s]?(?:\d{2}|\d{4})\b",
    "AADHAR Number": r"\b\d{4}\s?\d{4}\s?\d{4}\b",       
    "ABHA (Health Id)": r"\b\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b",
    "Voter ID": r"\b[A-Z]{3}\d{7}\b",
    "Passport": r"\b[A-Z][0-9]{7}\b",
    "PAN": r"\b[A-Z]{5}\d{4}[A-Z]\b"
}

def detect_pii_regex(ocr_data, page=1):
    results = []
    seen = set()

    for item in ocr_data:
        text = item.get("text", "")
        box = item.get("box", [])
        conf = item.get("confidence", 1.0)
        matches = []

        # Run all regex patterns
        for label, pattern in PII_PATTERNS.items():
            if re.search(pattern, text):
                matches.append((text, label))

        # Deduplicate
        for entity, etype in matches:
            if (entity, etype) not in seen:
                results.append({
                    "page": page,
                    "entity": entity,
                    "type": etype,
                    "bbox": box,
                    "confidence": float(conf)
                })
                seen.add((entity, etype))

    return results if results else []
