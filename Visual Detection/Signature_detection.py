import numpy as np
import os
from ultralytics import YOLO
from huggingface_hub import hf_hub_download
import cv2
import supervision as sv

# Download YOLO model from HuggingFace (once)
model_path = hf_hub_download(
    repo_id="tech4humans/yolov8s-signature-detector",
    filename="yolov8s.pt"
)

# Load YOLO model
model = YOLO(model_path)


def predict_bounding_boxes_from_pil(images, ocr=None):
    results_data = []

    for page_num, pil_img in enumerate(images, start=1):
        # Convert PIL → numpy array (OpenCV BGR format)
        img_cv2 = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)

        # Run YOLO prediction
        results = model(img_cv2)

        # Convert Ultralytics results to Supervision Detections
        detections = sv.Detections.from_ultralytics(results[0])

        for box, score in zip(detections.xyxy, detections.confidence):
            x1, y1, x2, y2 = map(int, box)

            # Crop region for OCR if provided
            text = None
            if ocr:
                crop = pil_img.crop((x1, y1, x2, y2))
                ocr_result = ocr.ocr(np.array(crop), cls=True)
                if ocr_result and ocr_result[0]:
                    text = ocr_result[0][0][1][0]

            results_data.append({
                "page": page_num,
                "text": "Signature",
                "confidence": float(score),
                "box": [x1, y1, x2, y2]
            })

    return results_data
