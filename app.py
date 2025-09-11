import os
import sys
import io
import base64
import importlib.util
import uvicorn
import numpy as np
from PIL import Image
from paddleocr import PaddleOCR
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import json
from utils.text_extraction import extract_text_with_boxes_from_list
from utils.reducted import blur_entities
sys.path.append(os.path.join(os.path.dirname(__file__), 'Text Detection'))
from names_detection import extract_indian_names
from address_detection import extract_indian_addresses
from regrex import detect_pii_regex
sys.path.append(os.path.join(os.path.dirname(__file__), 'Visual Detection'))
from fingerprint_detection import detect_fingerprint
from Face_Detection import detect_faces
from Signature_detection import predict_bounding_boxes_from_pil


spec = importlib.util.spec_from_file_location(
    "qr_barcode_detection", 
    os.path.join(os.path.dirname(__file__), 'Visual Detection', 'QR&Barcode_detection.py')
)
qr_barcode_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qr_barcode_module)
detect_qr_barcodes = qr_barcode_module.detect_qr_barcodes

ocr = PaddleOCR(
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)


app = FastAPI(title="Visual PII Stripper", description="API for detecting and blurring PII in images")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), filters: str = Form(...)):
    try:
        # Parse the filters from JSON string
        selected_filters = json.loads(filters)
        
        file_bytes = await file.read()
        img = Image.open(io.BytesIO(file_bytes))
        
        # Convert to RGB if needed and create images list
        if img.mode != 'RGB':
            img = img.convert('RGB')
        images = [img]

        all_detections = []
        
        for img in images:
            img_np = np.array(img)
            res = ocr.predict(img_np)
            all_detections.extend(res)

        # Extract structured text from OCR results
        structured_text = extract_text_with_boxes_from_list(all_detections)
        all_detections = []  # Reset for actual detections

        # Run detections based on selected filters
        if "Name" in selected_filters and structured_text:
            all_detections.extend(extract_indian_names(structured_text))
            
        if "Address" in selected_filters and structured_text:
            all_detections.extend(extract_indian_addresses(structured_text))
            
        # Detect all PII regex patterns first, then filter based on selected filters
        if structured_text:
            pii_detections = detect_pii_regex(structured_text)
            print(pii_detections)
            # Filter based on selected filters
            filtered_pii = []
            for detection in pii_detections:
                if detection.get('type') in selected_filters:
                    filtered_pii.append(detection)
            all_detections.extend(filtered_pii)
            
        if "QR & Barcodes" in selected_filters:
            all_detections.extend(detect_qr_barcodes(images))
            
        if "Signature" in selected_filters:
            all_detections.extend(predict_bounding_boxes_from_pil(images))
            
        if "Photo" in selected_filters:
            all_detections.extend(detect_faces(images))
            
        if "Fingerprint" in selected_filters:
            all_detections.extend(detect_fingerprint(images))
        
        # Convert 'box' to 'bbox' and normalize page numbers for blur_entities function
        formatted_detections = []
        for detection in all_detections:
            formatted_detection = detection.copy()
            if 'box' in formatted_detection:
                formatted_detection['bbox'] = formatted_detection.pop('box')
            # Normalize page numbers - ensure all detections use page 1 for single image
            formatted_detection['page'] = 1
            formatted_detections.append(formatted_detection)
        
        # Blur the detected entities
        blurred_images = blur_entities(images, formatted_detections)
        
        # Convert to base64
        buffered = io.BytesIO()
        blurred_images[0].save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return JSONResponse({
            "filename": file.filename,
            "detections": all_detections,
            "blurred_image": img_base64,
            "filters_applied": selected_filters
        })
        
    except Exception as e:
        import traceback
        print(f"Error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return JSONResponse({
            "error": f"Processing failed: {str(e)}",
            "traceback": traceback.format_exc()
        }, status_code=500)




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
