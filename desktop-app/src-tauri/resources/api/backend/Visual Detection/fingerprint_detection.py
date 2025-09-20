from ultralytics import YOLO
import numpy as np
import os

# Load YOLO once outside the function
# Get the installation directory from environment or use default
INSTALL_DIR = os.environ.get('VISUAL_PII_INSTALL_DIR', os.path.join(os.path.expanduser("~"), "AppData", "Local", "VisualPIIStripper"))
MODELS_DIR = os.path.join(INSTALL_DIR, 'models', 'yolo_weights')

# Check if we're in the installed location, otherwise use current directory
if os.path.exists(os.path.join(MODELS_DIR, "fingerprint_detection", "best.pt")):
    model_path = os.path.join(MODELS_DIR, "fingerprint_detection", "best.pt")
else:
    # Fallback to current directory for development
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "weights", "fingerprint_detection", "best.pt")

model = YOLO(model_path)

def detect_fingerprint(images, ocr=None):

    results_data = []

    for page_num, pil_img in enumerate(images, start=1):
        results = model.predict(source=pil_img)

        for r in results:
            boxes = r.boxes.xyxy.cpu().numpy()  # [x1, y1, x2, y2]
            scores = r.boxes.conf.cpu().numpy()

            for box, score in zip(boxes, scores):
                x1, y1, x2, y2 = map(int, box)

                # Crop region for OCR if PaddleOCR is provided
                text = None
                if ocr:
                    crop = pil_img.crop((x1, y1, x2, y2))
                    ocr_result = ocr.ocr(np.array(crop), cls=True)
                    if ocr_result and ocr_result[0]:
                        text = ocr_result[0][0][1][0]  # extracted text

                results_data.append({
                    "page": page_num,
                    "text": "fingerprint",
                    "confidence": float(score),
                    "box": [x1, y1, x2, y2]
                })

    return results_data
