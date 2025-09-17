from ultralytics import YOLO
import numpy as np
import os

# Load YOLO once outside the function
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "weights", "signature_detection", "best.pt")
model = YOLO(model_path)

def predict_bounding_boxes_from_pil(images, ocr=None):
    results_data = []
    
    for page_num, pil_img in enumerate(images, start=1):
        results = model.predict(source=pil_img)
        
        for r in results:
            if r.boxes is not None:
                boxes = r.boxes.xyxy.cpu().numpy()
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
                        "text": "Signature",
                        "confidence": float(score),
                        "box": [x1, y1, x2, y2]
                    })
    
    return results_data