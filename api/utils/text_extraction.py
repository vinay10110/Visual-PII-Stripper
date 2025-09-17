def extract_text_with_boxes_from_list(data):
    """
    Extracts recognized texts, confidence scores, and bounding boxes
    from a list of OCR page results.
    """
    results = []

    # Loop through each page in the list
    for page_idx, page in enumerate(data):
        texts = page.get("rec_texts", [])
        boxes = page.get("rec_boxes", [])
        scores = page.get("rec_scores", [])

        for text, box, score in zip(texts, boxes, scores):
            results.append({
                "page": page_idx,              # page number
                "text": text,                  # recognized text
                "confidence": round(score, 3), # confidence score
                "box": box.tolist() if hasattr(box, "tolist") else box  # convert np.array to list
            })

    return results



