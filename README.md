# Visual PII Stripper

A desktop application that detects and redacts Personally Identifiable Information (PII) from images and scanned documents. It uses OCR and visual detection models to find sensitive content such as names, addresses, IDs, QR/Barcodes, signatures, faces, and fingerprints, then blurs them for safe sharing.


## Download (Windows MSI)

- [Download Visual PII Stripper for Windows (MSI)](./visual-pii-stripper_0.1.0_x64_en-US.msi)

If you are viewing this on GitHub and the direct file link is restricted due to size, check the project Releases page for versioned installers.


## Before & After

- **Before (original page):**

  ![Before - original](screenshots/Patient%20HealthCare%20Record_page-0001.jpg)

- **After (PII blurred):**

  ![After - redacted](screenshots/processed_Patient%20HealthCare%20Record_page-0001.png)


## Key Features

- **PII Detection (Text):** Detects names, addresses, and common PII using OCR + regex rules.
- **Visual Detection:** Detects and redacts faces, signatures, fingerprints, and QR/Barcodes.
- **One-Click Redaction:** Upload an image, choose filters, get a redacted output instantly.
- **Modern UI:** Built with React + Chakra UI and packaged as a Tauri desktop app.
- **Offline-Friendly Models:** Installer can pre-download and cache model files for fast startup and offline use.


## How It Works (High Level)

- **Frontend:** React + Vite + Chakra UI (see `desktop-app/`).
- **Desktop Packaging:** Tauri v2 (MSI for Windows).
- **Backend API:** FastAPI + PaddleOCR + IndicNER + InsightFace + YOLO-based detectors (packaged inside the app under `desktop-app/src-tauri/resources/api/`).
- **Endpoint(s):**
  - `GET /` — health check
  - `POST /upload` — form-data with `file` (image) and `filters` (JSON string array)


## Quick Start (End Users)

1. Download and run the MSI: [visual-pii-stripper_0.1.0_x64_en-US.msi](./visual-pii-stripper_0.1.0_x64_en-US.msi)
2. Launch the app from the Start Menu or desktop shortcut.
3. Drag-and-drop an image or click to upload.
4. Select which PII categories to redact (e.g., Name, Address, QR & Barcodes, Signature, Photo, Fingerprint).
5. Click Process to get the blurred/redacted output.


## Development (from Source)

> Prerequisites: Node.js 18+, npm, and (for building the MSI) Rust + Tauri prerequisites (MSVC toolchain, etc.). See Tauri docs for setup.

- **Run the web UI (Vite dev server):**

```bash
cd desktop-app
npm install
npm run dev
```

- **Run the Tauri desktop app in dev mode:**

```bash
cd desktop-app
npm install
npx tauri dev
# or if tauri is available as an npm script:
# npm run tauri dev
```

- **Build the MSI (Release):**

```bash
cd desktop-app
npx tauri build
# Output MSI will be placed under:
# desktop-app/src-tauri/target/release/bundle/msi/
```

### Backend API (standalone, optional)
The packaged backend lives at `desktop-app/src-tauri/resources/api/backend/`.
To run it standalone for local testing:

```bash
# From the repo root
cd desktop-app/src-tauri/resources/api/installer
python -m venv .venv
.venv/Scripts/activate  # Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt

cd ../backend
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

- Health check: `GET http://localhost:8000/`
- Upload API example:

```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@path/to/your/image.png" \
  -F 'filters=["Name","Address","QR & Barcodes","Signature","Photo","Fingerprint"]'
```


## Installer and Model Caching (Advanced)
The automated installer (internal) supports offline-friendly model caching to speed up first run and avoid re-downloads. It installs to the user profile without admin permissions.

- **Install Location:** `%USERPROFILE%\AppData\Local\VisualPIIStripper`
- **Models Cached:**
  - PaddleOCR (text detection and OCR)
  - IndicNER (Indian names)
  - InsightFace (face detection)
  - YOLO weights (signature, fingerprint, QR/barcode)
- **Environment Variable:** `VISUAL_PII_INSTALL_DIR` can be set to point the backend to a specific model cache directory.

> Note: The main one-click MSI bundled with this repo is intended for end users. The Python-side installer scripts live under `desktop-app/src-tauri/resources/api/installer/` for development and packaging workflows.


## Google Colab Notebook
The file `visual_pii_stripper.ipynb` is a Google Colab notebook used for experimentation and demonstrations. You can upload it to your Google Drive and open with Colab, or open it directly in Colab if viewing from a GitHub remote. This notebook is not required to run the desktop app.


## Repository Structure (high level)

```
visual_pii_stripper/
├─ desktop-app/                     # React + Tauri desktop app
│  ├─ src-tauri/
│  │  ├─ resources/
│  │  │  └─ api/
│  │  │     ├─ backend/            # FastAPI app (app.py)
│  │  │     └─ installer/          # Python installer + requirements
│  │  └─ target/release/bundle/msi # Built MSI output (after build)
├─ screenshots/                     # Sample before/after images
├─ visual-pii-stripper_*.msi        # Windows installer (root copy)
└─ visual_pii_stripper.ipynb        # Colab notebook
```


## License
Specify your license here (e.g., MIT). If you add a `LICENSE` file, reference it here.


## Acknowledgements
- PaddleOCR
- IndicNER (ai4bharat)
- InsightFace
- YOLO-based detectors
- React, Chakra UI, Tauri
