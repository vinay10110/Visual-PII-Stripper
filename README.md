# Visual PII Stripper

A desktop application that detects and redacts Personally Identifiable Information (PII) from images and scanned documents. It uses OCR and visual detection models to find sensitive content such as names, addresses, IDs, QR/Barcodes, signatures, faces, and fingerprints, then blurs them for safe sharing.


## Installation

- Option A — Windows MSI (recommended)

  ## Download

[Download visual-pii-stripper_0.1.0_x64_en-US.msi](https://github.com/vinay10110/Visual-PII-Stripper/raw/master/visual-pii-stripper_0.1.0_x64_en-US.msi)


  First launch notes:
  - On the first run, the app will download and cache the required AI models and dependencies. This one-time setup can take a few minutes depending on your network speed.
  - After setup completes, everything runs locally and the app can work fully offline.
  - If GitHub restricts direct file downloads due to size, use the project Releases page to download the MSI.

- Option B — Run from source (developers)

  Prerequisites: Node.js 18+, Rust (MSVC) and Tauri prerequisites.

  Steps:
  ```bash
  # From the project root
  cd desktop-app
  npm i
  npm run tauri dev
  ```

## Before & After

<p align="left">
  <img src="screenshots/Patient%20HealthCare%20Record_page-0001.jpg" alt="Before - original" width="420" />
  <img src="screenshots/processed_Patient%20HealthCare%20Record_page-0001.png" alt="After - redacted" width="420" />
</p>
<sub>Images resized for README clarity.</sub>


## Key Features

- **Single file or whole folder:** Process one image or a folder of images in batch with clear progress.
- **Flexible filters:** Choose what to redact: Name, Address, PII regex (e.g., phones, emails, IDs), QR & Barcodes, Signature, Photo (faces), Fingerprint.
- **Accurate detection:** OCR + ML models (PaddleOCR, IndicNER, InsightFace, YOLO-based detectors) for text and visual PII.
- **Private by design:** After the first run’s model download, everything works offline and on-device; no cloud uploads.
- **Fast redaction preview:** Get the blurred result and save the redacted image.
- **Modern UI:** Drag-and-drop, responsive layouts, and smooth interactions (React + Chakra UI, packaged with Tauri).


## Quick Start (End Users)

1. Install via MSI (Option A) or run from source (Option B) as described above.
2. Open the app.
3. Choose your input:
   - Single image file (PNG/JPG), or
   - A folder of images for batch redaction.
4. Select which PII categories to redact (e.g., Name, Address, QR & Barcodes, Signature, Photo, Fingerprint).
5. Click Process to generate redacted output, then preview and Save.
6. Note: On the very first launch, the app downloads required models/packages. This can take a few minutes. Subsequent runs are fast and fully offline.

## Google Colab Notebook
The file `visual_pii_stripper.ipynb` is a Google Colab notebook used for experimentation and demonstrations. You can upload it to your Google Drive and open with Colab, or open it directly in Colab if viewing from a GitHub remote. This notebook is not required to run the desktop app.

## Acknowledgements
- PaddleOCR
- IndicNER (ai4bharat)
- InsightFace
- YOLO-based detectors
- React, Chakra UI, Tauri

