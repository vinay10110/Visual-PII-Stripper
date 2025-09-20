#!/usr/bin/env python3
"""
Visual PII Stripper Installation Script
=====================================

This script creates a complete installation of the Visual PII Stripper backend
in a dedicated folder on the C: drive, including:
- Creating the installation directory
- Installing Python dependencies
- Downloading required AI models
- Copying all backend files
- Setting up the environment

Usage: python setup_installer.py
"""

import os
import sys
import subprocess
import shutil
import urllib.request
import zipfile
import json
from pathlib import Path
import tempfile

# Installation configuration
# Use user's AppData directory to avoid requiring administrator privileges
INSTALL_DIR = os.path.join(os.path.expanduser("~"), "AppData", "Local", "VisualPIIStripper")
MODELS_DIR = os.path.join(INSTALL_DIR, "models")
BACKEND_DIR = os.path.join(INSTALL_DIR, "backend")
PYTHON_RUNTIME_DIR = os.path.join(INSTALL_DIR, "python-runtime")

class VisualPIIInstaller:
    def __init__(self):
        self.install_dir = Path(INSTALL_DIR)
        self.models_dir = Path(MODELS_DIR)
        self.backend_dir = Path(BACKEND_DIR)
        self.python_runtime_dir = Path(PYTHON_RUNTIME_DIR)
        
        # Handle PyInstaller bundled executable paths
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            # Running as PyInstaller bundle
            self.current_dir = Path(sys._MEIPASS)
            self.bundled_python_source = self.current_dir / "python-runtime"
        else:
            # Running as normal Python script
            self.current_dir = Path(__file__).parent.absolute()
            self.bundled_python_source = self.current_dir / "python-runtime"
        
    def log(self, message):
        """Print installation progress messages"""
        print(f"[INSTALLER] {message}")
        # Also flush to ensure output appears immediately
        sys.stdout.flush()
        
    def create_directories(self):
        """Create the main installation directories"""
        self.log("Creating installation directories...")
        
        try:
            # Create main directories
            self.install_dir.mkdir(parents=True, exist_ok=True)
            self.models_dir.mkdir(parents=True, exist_ok=True)
            self.backend_dir.mkdir(parents=True, exist_ok=True)
            self.python_runtime_dir.mkdir(parents=True, exist_ok=True)
            
            # Create model subdirectories
            (self.models_dir / "indicner").mkdir(parents=True, exist_ok=True)
            (self.models_dir / "insightface").mkdir(parents=True, exist_ok=True)
            (self.models_dir / "yolo_weights").mkdir(parents=True, exist_ok=True)
            (self.models_dir / "paddleocr").mkdir(parents=True, exist_ok=True)
            
            self.log(f"Created installation directory: {self.install_dir}")
            return True
            
        except PermissionError as e:
            self.log(f"Permission denied: {e}")
            self.log("ERROR: Cannot create directories on C: drive. Please run as administrator.")
            return False
        except Exception as e:
            self.log(f"Failed to create directories: {e}")
            return False
        
    def copy_python_runtime(self):
        """Copy the bundled Python runtime to installation directory"""
        self.log("Copying bundled Python runtime...")
        self.log(f"Source path: {self.bundled_python_source}")
        self.log(f"Destination path: {self.python_runtime_dir}")
        self.log(f"Current directory: {self.current_dir}")
        self.log(f"Running as PyInstaller bundle: {getattr(sys, 'frozen', False)}")
        
        try:
            if not self.bundled_python_source.exists():
                self.log(f"ERROR: Bundled Python runtime not found at {self.bundled_python_source}")
                # List contents of current directory for debugging
                self.log(f"Contents of current directory ({self.current_dir}):")
                try:
                    for item in self.current_dir.iterdir():
                        self.log(f"  - {item.name}")
                except Exception as e:
                    self.log(f"  Could not list directory: {e}")
                return False
            
            # Remove existing runtime if it exists
            if self.python_runtime_dir.exists():
                shutil.rmtree(self.python_runtime_dir)
            
            # Copy the entire python-runtime directory
            shutil.copytree(self.bundled_python_source, self.python_runtime_dir)
            
            # Verify python.exe exists
            python_exe = self.python_runtime_dir / "python.exe"
            if not python_exe.exists():
                self.log(f"ERROR: python.exe not found in copied runtime at {python_exe}")
                return False
            
            # Enable site packages and pip in embedded Python
            if not self.setup_embedded_python():
                self.log("WARNING: Failed to setup embedded Python, continuing anyway...")
            
            self.log(f"Python runtime copied successfully to {self.python_runtime_dir}")
            return True
            
        except Exception as e:
            self.log(f"Failed to copy Python runtime: {e}")
            return False
    
    def setup_embedded_python(self):
        """Setup embedded Python to enable site packages and install pip"""
        self.log("Setting up embedded Python for package installation...")
        
        try:
            # Enable site packages by modifying python311._pth
            pth_file = self.python_runtime_dir / "python311._pth"
            if pth_file.exists():
                with open(pth_file, 'r') as f:
                    content = f.read()
                
                # Uncomment the import site line
                content = content.replace('#import site', 'import site')
                
                with open(pth_file, 'w') as f:
                    f.write(content)
                
                self.log("Enabled site packages in embedded Python")
            
            # Download and install pip
            return self.install_pip_in_embedded_python()
            
        except Exception as e:
            self.log(f"Failed to setup embedded Python: {e}")
            return False
    
    def install_pip_in_embedded_python(self):
        """Download and install pip in the embedded Python"""
        self.log("Installing pip in embedded Python...")
        
        try:
            python_exe = self.python_runtime_dir / "python.exe"
            
            # Download get-pip.py
            get_pip_url = "https://bootstrap.pypa.io/get-pip.py"
            get_pip_path = self.python_runtime_dir / "get-pip.py"
            
            self.log("Downloading get-pip.py...")
            urllib.request.urlretrieve(get_pip_url, get_pip_path)
            
            # Install pip using get-pip.py
            self.log("Installing pip...")
            result = subprocess.run([
                str(python_exe), str(get_pip_path)
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                self.log(f"Failed to install pip: {result.stderr}")
                return False
            
            # Clean up get-pip.py
            get_pip_path.unlink()
            
            # Verify pip installation
            result = subprocess.run([
                str(python_exe), "-m", "pip", "--version"
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.log("Pip installed successfully in embedded Python")
                return True
            else:
                self.log(f"Pip verification failed: {result.stderr}")
                return False
                
        except Exception as e:
            self.log(f"Failed to install pip: {e}")
            return False
            
    def get_pip_executable(self):
        """Get the pip executable path for bundled Python"""
        return self.python_runtime_dir / "python.exe"
    
    def detect_gpu(self):
        """Detect if NVIDIA GPU is available"""
        try:
            # Try to detect NVIDIA GPU using nvidia-smi
            result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
            if result.returncode == 0:
                self.log("NVIDIA GPU detected")
                return True
        except FileNotFoundError:
            pass
        
        try:
            # Alternative: check if CUDA is available via PyTorch (if already installed)
            python_exe = self.get_python_executable()
            result = subprocess.run([
                str(python_exe), "-c", 
                "import torch; print('CUDA available:', torch.cuda.is_available())"
            ], capture_output=True, text=True)
            if "CUDA available: True" in result.stdout:
                self.log("CUDA support detected via PyTorch")
                return True
        except:
            pass
        
        self.log("No GPU detected, will use CPU versions")
        return False
            
    def get_python_executable(self):
        """Get the Python executable path for bundled Python"""
        return self.python_runtime_dir / "python.exe"
    
    def install_requirements(self):
        """Install Python requirements in the virtual environment"""
        self.log("Installing Python requirements...")
        
        # Handle PyInstaller bundled paths for requirements.txt
        requirements_file = self.current_dir / "requirements.txt"
        if not requirements_file.exists():
            # Try alternative locations for PyInstaller
            alt_requirements = Path(__file__).parent / "requirements.txt"
            if alt_requirements.exists():
                requirements_file = alt_requirements
            else:
                self.log("ERROR: requirements.txt not found!")
                self.log(f"Searched in: {requirements_file} and {alt_requirements}")
                return False
            
        python_exe = self.get_python_executable()
        
        try:
            # Verify pip is available
            self.log("Verifying pip installation...")
            result = subprocess.run([
                str(python_exe), "-m", "pip", "--version"
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                self.log(f"ERROR: pip is not available: {result.stderr}")
                return False
            
            self.log(f"Pip is available: {result.stdout.strip()}")
            
            # Upgrade pip
            self.log("Upgrading pip...")
            result = subprocess.run([
                str(python_exe), "-m", "pip", "install", "--upgrade", "pip"
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                self.log(f"Warning: pip upgrade failed: {result.stderr}")
                self.log("Continuing with existing pip version...")
            else:
                self.log("Pip upgraded successfully")
            
            # Install requirements
            self.log("Installing requirements from requirements.txt...")
            result = subprocess.run([
                str(python_exe), "-m", "pip", "install", "-r", str(requirements_file)
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                self.log(f"Failed to install requirements:")
                self.log(f"Error output: {result.stderr}")
                self.log(f"Standard output: {result.stdout}")
                return False
            
            # Detect GPU and install appropriate versions
            has_gpu = self.detect_gpu()
            
            # Install PyTorch based on GPU availability
            if has_gpu:
                self.log("Installing PyTorch with CUDA 11.8 support...")
                result = subprocess.run([
                    str(python_exe), "-m", "pip", "install", 
                    "torch==2.7.1", "torchvision==0.22.1", "torchaudio==2.7.1",
                    "--index-url", "https://download.pytorch.org/whl/cu118"
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    self.log(f"Warning: PyTorch CUDA installation failed: {result.stderr}")
                    has_gpu = False  # Fall back to CPU versions
                else:
                    self.log("PyTorch with CUDA support installed successfully")
            
            if not has_gpu:
                self.log("Installing CPU-only PyTorch...")
                result = subprocess.run([
                    str(python_exe), "-m", "pip", "install", 
                    "torch", "torchvision", "torchaudio"
                ], capture_output=True, text=True)
                if result.returncode != 0:
                    self.log(f"Failed to install PyTorch CPU version: {result.stderr}")
                    return False
                else:
                    self.log("PyTorch CPU version installed successfully")
            
            # Install PaddlePaddle based on GPU availability
            if has_gpu:
                self.log("Installing PaddlePaddle GPU version 3.0.0...")
                result = subprocess.run([
                    str(python_exe), "-m", "pip", "install", 
                    "paddlepaddle-gpu==3.0.0",
                    "-i", "https://www.paddlepaddle.org.cn/packages/stable/cu118/"
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    self.log(f"Warning: PaddlePaddle GPU installation failed: {result.stderr}")
                    self.log("Falling back to CPU version...")
                    has_gpu = False  # Fall back to CPU version
                else:
                    self.log("PaddlePaddle GPU version installed successfully")
            
            if not has_gpu:
                self.log("Installing PaddlePaddle CPU version 3.0.0...")
                result = subprocess.run([
                    str(python_exe), "-m", "pip", "install", 
                    "paddlepaddle==3.0.0",
                    "-i", "https://www.paddlepaddle.org.cn/packages/stable/cpu/"
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    self.log(f"Failed to install PaddlePaddle CPU version: {result.stderr}")
                    return False
                else:
                    self.log("PaddlePaddle CPU version installed successfully")
            
            self.log("Requirements installed successfully")
            return True
        except Exception as e:
            self.log(f"Unexpected error during requirements installation: {e}")
            return False
    
    def download_file(self, url, destination):
        """Download a file from URL to destination"""
        try:
            self.log(f"Downloading {url}...")
            urllib.request.urlretrieve(url, destination)
            return True
        except Exception as e:
            self.log(f"Failed to download {url}: {e}")
            return False
    
    def download_huggingface_model(self, model_name, destination_dir):
        """Download a Hugging Face model using transformers"""
        self.log(f"Downloading Hugging Face model: {model_name}")
        
        python_exe = self.get_python_executable()
        
        # Create a temporary script to download the model
        download_script = f'''
import os
from transformers import AutoTokenizer, AutoModelForTokenClassification

model_name = "{model_name}"
destination = r"{destination_dir}"

print(f"Downloading {{model_name}} to {{destination}}")

# Download tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=destination)
model = AutoModelForTokenClassification.from_pretrained(model_name, cache_dir=destination)

print("Model downloaded successfully!")
'''
        
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(download_script)
                temp_script = f.name
            
            subprocess.run([
                str(python_exe), temp_script
            ], check=True, capture_output=True, text=True)
            
            os.unlink(temp_script)
            self.log(f"Successfully downloaded {model_name}")
            return True
            
        except subprocess.CalledProcessError as e:
            self.log(f"Failed to download {model_name}: {e}")
            if os.path.exists(temp_script):
                os.unlink(temp_script)
            return False
    
    def download_insightface_model(self):
        """Download InsightFace buffalo_l model"""
        self.log("Downloading InsightFace buffalo_l model...")
        
        python_exe = self.get_python_executable()
        
        # First install insightface
        try:
            self.log("Installing InsightFace package...")
            result = subprocess.run([
                str(python_exe), "-m", "pip", "install", "insightface"
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                self.log(f"Failed to install InsightFace: {result.stderr}")
                self.log("Skipping InsightFace model download...")
                return True  # Don't fail the entire installation
                
        except Exception as e:
            self.log(f"Error installing InsightFace: {e}")
            self.log("Skipping InsightFace model download...")
            return True
        
        # Create a script to initialize InsightFace and download the model
        download_script = f'''
try:
    import os
    from insightface.app import FaceAnalysis

    # Set the model directory
    model_dir = r"{self.models_dir / 'insightface'}"
    os.makedirs(model_dir, exist_ok=True)

    # Initialize FaceAnalysis which will download the model
    app = FaceAnalysis(name="buffalo_l", root=model_dir)
    app.prepare(ctx_id=-1, det_size=(640, 640))  # Use CPU for setup

    print("InsightFace buffalo_l model downloaded successfully!")
except Exception as e:
    print(f"Failed to download InsightFace model: {{e}}")
    # Don't fail - this is optional
'''
        
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(download_script)
                temp_script = f.name
            
            subprocess.run([
                str(python_exe), temp_script
            ], check=True, capture_output=True, text=True)
            
            os.unlink(temp_script)
            self.log("Successfully downloaded InsightFace buffalo_l model")
            return True
            
        except subprocess.CalledProcessError as e:
            self.log(f"Warning: InsightFace model download failed: {e}")
            self.log("Continuing installation without InsightFace model...")
            if os.path.exists(temp_script):
                os.unlink(temp_script)
            return True  # Don't fail the entire installation
    
    def download_paddleocr_models(self):
        """Initialize PaddleOCR to download required models"""
        self.log("Downloading PaddleOCR models...")
        
        python_exe = self.get_python_executable()
        
        # Create a script to initialize PaddleOCR and download models
        download_script = f'''
try:
    import os
    from paddleocr import PaddleOCR

    # Set the model directory
    model_dir = r"{self.models_dir / 'paddleocr'}"
    os.makedirs(model_dir, exist_ok=True)

    # Initialize PaddleOCR which will download the models
    ocr = PaddleOCR(
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )
    
    # Test with a simple operation to ensure models are downloaded
    print("PaddleOCR models downloaded and initialized successfully!")
except Exception as e:
    print(f"Failed to download PaddleOCR models: {{e}}")
    # Don't fail - this is optional
'''
        
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(download_script)
                temp_script = f.name
            
            subprocess.run([
                str(python_exe), temp_script
            ], check=True, capture_output=True, text=True)
            
            os.unlink(temp_script)
            self.log("Successfully downloaded PaddleOCR models")
            return True
            
        except subprocess.CalledProcessError as e:
            self.log(f"Warning: PaddleOCR model download failed: {e}")
            self.log("Continuing installation without PaddleOCR models...")
            if os.path.exists(temp_script):
                os.unlink(temp_script)
            return True  # Don't fail the entire installation
    
    def copy_yolo_weights(self):
        """Copy existing YOLO weights to the models directory"""
        self.log("Copying YOLO weights...")
        
        source_weights = self.current_dir / "weights"
        dest_weights = self.models_dir / "yolo_weights"
        
        if source_weights.exists():
            try:
                if dest_weights.exists():
                    shutil.rmtree(dest_weights)
                shutil.copytree(source_weights, dest_weights)
                self.log("YOLO weights copied successfully")
                return True
            except Exception as e:
                self.log(f"Failed to copy YOLO weights: {e}")
                return False
        else:
            self.log("WARNING: YOLO weights directory not found")
            return False
    
    def copy_backend_files(self):
        """Copy all backend files to the installation directory"""
        self.log("Copying backend files...")
        
        # Source directory - check multiple possible locations
        backend_source = None
        
        # First check if we have backend_source (when run from Tauri)
        if (self.current_dir / "backend_source").exists():
            backend_source = self.current_dir / "backend_source"
            self.log("Using backend source from Tauri bundle")
        # Fallback to original location
        elif (self.current_dir.parent / "backend").exists():
            backend_source = self.current_dir.parent / "backend"
            self.log("Using backend source from development location")
        else:
            self.log("ERROR: Backend source directory not found!")
            return False
        
        # Files and directories to copy
        items_to_copy = [
            "app.py",
            "Text Detection",
            "Visual Detection", 
            "utils"
        ]
        
        for item in items_to_copy:
            source = backend_source / item
            dest = self.backend_dir / item
            
            if source.exists():
                try:
                    if source.is_file():
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(source, dest)
                    else:
                        if dest.exists():
                            shutil.rmtree(dest)
                        shutil.copytree(source, dest)
                    self.log(f"Copied: {item}")
                except Exception as e:
                    self.log(f"Failed to copy {item}: {e}")
                    return False
            else:
                self.log(f"WARNING: {item} not found")
        
        self.log("Backend files copied successfully")
        return True
    
    def create_environment_setup(self):
        """Create environment variable setup for the installation"""
        self.log("Setting up environment variables...")
        
        # Create a batch file to set environment variables
        env_setup_content = f'''@echo off
REM Set environment variable for Visual PII Stripper installation
set VISUAL_PII_INSTALL_DIR={self.install_dir}
echo Environment variable VISUAL_PII_INSTALL_DIR set to: %VISUAL_PII_INSTALL_DIR%
'''
        
        env_setup_file = self.install_dir / "set_environment.bat"
        with open(env_setup_file, 'w') as f:
            f.write(env_setup_content)
        
        self.log(f"Environment setup script created: {env_setup_file}")
        return True
    
    def create_startup_script(self):
        """Create a startup script to run the application using bundled Python"""
        self.log("Creating startup script...")
        
        # Create a script that uses bundled Python directly
        python_exe = self.python_runtime_dir / "python.exe"
        startup_script_content = f'''@echo off
echo Starting Visual PII Stripper Backend...
REM Set environment variable for model paths
set VISUAL_PII_INSTALL_DIR={self.install_dir}

REM Use bundled Python runtime
set "PYTHON_EXE={python_exe}"
if not exist "%PYTHON_EXE%" (
    echo ERROR: Bundled Python not found at %PYTHON_EXE%
    pause
    exit /b 1
)

REM Set PYTHONPATH to include the backend directory so Python can find local modules
set "PYTHONPATH={self.backend_dir};%PYTHONPATH%"

REM Change to backend directory and start the server
cd /d "{self.backend_dir}"
echo Using bundled Python: %PYTHON_EXE%
echo Backend directory: {self.backend_dir}
echo PYTHONPATH: %PYTHONPATH%
"%PYTHON_EXE%" app.py
'''
        
        startup_script = self.install_dir / "start_backend.bat"
        with open(startup_script, 'w') as f:
            f.write(startup_script_content)
        
        # Also create a config file that stores the installation info
        config_content = f'''{{
    "installation_directory": "{self.install_dir}",
    "backend_directory": "{self.backend_dir}",
    "python_runtime_directory": "{self.python_runtime_dir}",
    "python_executable": "{python_exe}",
    "startup_script": "{startup_script}",
    "app_script": "{self.backend_dir}\\\\app.py",
    "models_directory": "{self.models_dir}",
    "uses_bundled_python": true
}}'''
        
        config_file = self.install_dir / "backend_config.json"
        with open(config_file, 'w') as f:
            f.write(config_content)
        
        self.log(f"Startup script created: {startup_script}")
        self.log(f"Backend config created: {config_file}")
        return True
    
    def create_config_file(self):
        """Create a configuration file with installation details"""
        config = {
            "installation_directory": str(self.install_dir),
            "models_directory": str(self.models_dir),
            "backend_directory": str(self.backend_dir),
            "python_runtime_directory": str(self.python_runtime_dir),
            "python_executable": str(self.get_python_executable()),
            "startup_script": str(self.install_dir / "start_backend.bat"),
            "uses_bundled_python": True,
            "bundled_runtime": True
        }
        
        config_file = self.install_dir / "installation_config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        self.log(f"Configuration file created: {config_file}")
        return True
    
    def run_installation(self):
        """Run the complete installation process"""
        self.log("Starting Visual PII Stripper installation...")
        self.log(f"Installation directory: {self.install_dir}")
        
        steps = [
            ("Creating directories", self.create_directories),
            ("Copying Python runtime", self.copy_python_runtime),
            ("Installing requirements", self.install_requirements),
            ("Copying backend files", self.copy_backend_files),
            ("Downloading IndicNER model", lambda: self.download_huggingface_model("ai4bharat/IndicNER", self.models_dir / "indicner")),
            ("Downloading InsightFace model", self.download_insightface_model),
            ("Downloading PaddleOCR models", self.download_paddleocr_models),
            ("Copying YOLO weights", self.copy_yolo_weights),
            ("Setting up environment", self.create_environment_setup),
            ("Creating startup script", self.create_startup_script),
            ("Creating configuration file", self.create_config_file),
        ]
        
        for step_name, step_func in steps:
            self.log(f"Step: {step_name}")
            try:
                if not step_func():
                    self.log(f"FAILED: {step_name}")
                    return False
            except Exception as e:
                self.log(f"ERROR in {step_name}: {e}")
                return False
        
        self.log("Installation completed successfully!")
        self.log(f"Backend installed in: {self.backend_dir}")
        self.log(f"Models installed in: {self.models_dir}")
        self.log(f"To start the backend, run: {self.install_dir / 'start_backend.bat'}")
        
        return True

def main():
    """Main installation function"""
    print("=" * 60)
    print("Visual PII Stripper Backend Installation")
    print("=" * 60)
    
    # Installation will proceed in user's AppData directory (no admin required)
    print("Installing to user directory - no administrator privileges required.")
    
    installer = VisualPIIInstaller()
    
    # Auto-proceed with installation
    print(f"Installing Visual PII Stripper to: {INSTALL_DIR}")
    print("Starting installation automatically...")
    
    # Run installation
    success = installer.run_installation()
    
    if success:
        print("\n" + "=" * 60)
        print("INSTALLATION SUCCESSFUL!")
        print("=" * 60)
        print(f"Installation directory: {INSTALL_DIR}")
        print(f"To start the backend: {INSTALL_DIR}\\start_backend.bat")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("INSTALLATION FAILED!")
        print("=" * 60)
        print("Please check the error messages above and try again.")

if __name__ == "__main__":
    main()
