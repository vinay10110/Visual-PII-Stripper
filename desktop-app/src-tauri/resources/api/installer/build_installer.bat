@echo off
echo Building Visual PII Stripper Installer...
echo.

REM Check required folders and files
echo Checking required files and folders...
if not exist "python-runtime" (
    echo ERROR: python-runtime folder not found!
    pause
    exit /b 1
)
if not exist "requirements.txt" (
    echo ERROR: requirements.txt not found!
    pause
    exit /b 1
)
if not exist "weights" (
    echo ERROR: weights folder not found!
    pause
    exit /b 1
)
if not exist "..\backend" (
    echo ERROR: backend folder not found in parent directory!
    pause
    exit /b 1
)
echo All required files and folders found!
echo.

REM Clean previous builds
echo Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"
if exist "build" rmdir /s /q "build"

REM Build the installer executable
echo Building executable with PyInstaller...
python -m PyInstaller setup_installer.spec

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo BUILD SUCCESSFUL!
    echo ============================================================
    echo Executable created: dist\setup_installer.exe
    echo File size: 
    dir "dist\setup_installer.exe" | find "setup_installer.exe"
    echo.
    echo To test the installer:
    echo 1. Run: dist\setup_installer.exe
    echo 2. Check installation at: %USERPROFILE%\AppData\Local\VisualPIIStripper
    echo 3. Run backend with: %USERPROFILE%\AppData\Local\VisualPIIStripper\start_backend.bat
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo BUILD FAILED!
    echo ============================================================
    echo Please check the error messages above.
)

pause
