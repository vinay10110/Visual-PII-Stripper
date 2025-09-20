import numpy as np
import os
from insightface.app import FaceAnalysis

# Get the installation directory from environment or use default
INSTALL_DIR = os.environ.get('VISUAL_PII_INSTALL_DIR', os.path.join(os.path.expanduser("~"), "AppData", "Local", "VisualPIIStripper"))
MODELS_DIR = os.path.join(INSTALL_DIR, 'models', 'insightface')

# Initialize InsightFace with the correct model directory
# Check if we're in the installed location, otherwise use default behavior
if os.path.exists(MODELS_DIR):
    app = FaceAnalysis(name="buffalo_l", root=MODELS_DIR)
else:
    # Fallback to default behavior for development
    app = FaceAnalysis(name="buffalo_l")
app.prepare(ctx_id=0, det_size=(640, 640))  # ctx_id=0 -> GPU, -1 -> CPU

def detect_faces(images):
    results_data = []

    for page_num, pil_img in enumerate(images, start=1):
        # Convert PIL → numpy array (InsightFace expects BGR, like OpenCV)
        img_np = np.array(pil_img.convert("RGB"))[:, :, ::-1]  

        # Run detection
        faces = app.get(img_np)

        for face in faces:
            # face.bbox -> [x1, y1, x2, y2]
            # face.det_score -> confidence
            facial_area = face.bbox.astype(int).tolist()
            confidence = float(face.det_score)

            results_data.append({
                "page": page_num,
                "text": "Face",
                "confidence": confidence,
                "box": facial_area
            })

    return results_data
