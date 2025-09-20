use std::process::{Command, Stdio};
use std::fs;
use std::path::Path;
use std::io::{BufRead, BufReader};
use std::thread;
use tauri::Emitter;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn check_backend_installed() -> Result<bool, String> {
    println!("🔍 Checking if backend is installed...");
    
    let app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let install_path = app_data.join("VisualPIIStripper");
    let startup_script = install_path.join("start_backend.bat");
    
    println!("📁 Install path: {:?}", install_path);
    println!("📜 Startup script: {:?}", startup_script);
    println!("✅ start_backend.bat exists: {}", startup_script.exists());
    
    Ok(startup_script.exists())
}

#[tauri::command]
async fn install_backend() -> Result<String, String> {
    println!("🔧 Starting backend installation...");
    
    let app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let install_path = app_data.join("VisualPIIStripper");
    
    // Check if already installed
    if install_path.exists() {
        println!("✅ Backend appears to be already installed at: {:?}", install_path);
        return Ok("Backend installation found. If you're having issues, please run the setup_installer.exe manually.".to_string());
    }
    
    // Look for setup_installer.exe in bundled resources first, then exe directory
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Could not get current exe path: {}", e))?;
    println!("📍 Current exe path: {:?}", exe_path);
    
    let exe_dir = exe_path
        .parent()
        .ok_or("Could not get parent directory")?;
    println!("📁 Exe directory: {:?}", exe_dir);
    
    // First try bundled resources
    let resources_dir = exe_dir.join("resources");
    let bundled_installer = resources_dir.join("setup_installer.exe");
    println!("🔍 Looking for bundled installer at: {:?} (exists: {})", bundled_installer, bundled_installer.exists());
    
    // Then try exe directory
    let local_installer = exe_dir.join("setup_installer.exe");
    println!("🔍 Looking for local installer at: {:?} (exists: {})", local_installer, local_installer.exists());
    
    // Use whichever one exists
    let installer_exe = if bundled_installer.exists() {
        bundled_installer
    } else if local_installer.exists() {
        local_installer
    } else {
        // List all files in the exe directory for debugging
        println!("📂 Files in exe directory:");
        if let Ok(entries) = fs::read_dir(exe_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    println!("  - {:?}", entry.file_name());
                }
            }
        }
        
        // Check resources directory too
        if resources_dir.exists() {
            println!("📂 Files in resources directory:");
            if let Ok(entries) = fs::read_dir(&resources_dir) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        println!("  - {:?}", entry.file_name());
                    }
                }
            }
        }
        
        return Err("setup_installer.exe not found in bundled resources or exe directory".to_string());
    };
    
    println!("✅ Using installer: {:?}", installer_exe);
    
    // Found the installer, run it automatically
    println!("🚀 Running setup_installer.exe...");
    let mut cmd = Command::new(&installer_exe);
    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    // Hide console window on Windows
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to run installer: {}", e))?;
    
    println!("📤 Installer exit code: {:?}", output.status.code());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    println!("📤 Installer stdout: {}", stdout);
    println!("📤 Installer stderr: {}", stderr);
    
    if output.status.success() {
        Ok(format!("Installation completed successfully!\n{}", stdout))
    } else {
        Err(format!("Installation failed:\n{}", stderr))
    }
}

#[tauri::command]
async fn install_backend_direct() -> Result<String, String> {
    println!("🐍 Attempting direct backend installation using system Python...");
    
    // Check if Python is available on the system
    let mut python_cmd = Command::new("python");
    python_cmd.args(["--version"]);
    
    // Hide console window on Windows
    #[cfg(windows)]
    python_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    
    let python_check = python_cmd.output();
    
    if python_check.is_err() {
        return Err(format!(
            "Python not found on system. Please either:\n\
            1. Install Python from python.org, or\n\
            2. Place setup_installer.exe in the same directory as this application\n\
            3. Restart this application after installation"
        ));
    }
    
    let app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let install_path = app_data.join("VisualPIIStripper");
    let backend_dir = install_path.join("backend");
    
    // Create directories
    fs::create_dir_all(&backend_dir)
        .map_err(|e| format!("Failed to create backend directory: {}", e))?;
    
    // Create a minimal requirements.txt
    let requirements = r#"flask==2.3.3
flask-cors==4.0.0
paddlepaddle==2.5.2
paddleocr==2.7.0.3
opencv-python==4.8.1.78
Pillow==10.0.1
numpy==1.24.4
transformers==4.35.2
torch==2.1.1
insightface==0.7.3
onnxruntime==1.16.3
"#;
    
    let requirements_path = backend_dir.join("requirements.txt");
    fs::write(&requirements_path, requirements)
        .map_err(|e| format!("Failed to write requirements.txt: {}", e))?;
    
    // Install packages using system Python
    println!("📦 Installing Python packages...");
    let mut pip_cmd = Command::new("python");
    pip_cmd.args(["-m", "pip", "install", "-r", requirements_path.to_str().unwrap(), "--user"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    // Hide console window on Windows
    #[cfg(windows)]
    pip_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    
    let pip_install = pip_cmd
        .output()
        .map_err(|e| format!("Failed to run pip install: {}", e))?;
    
    if !pip_install.status.success() {
        let stderr = String::from_utf8_lossy(&pip_install.stderr);
        return Err(format!("Failed to install Python packages:\n{}", stderr));
    }
    
    Ok("Basic backend installation completed using system Python. Some features may require manual setup.".to_string())
}

// Helper function to recursively copy directories
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn start_backend() -> Result<String, String> {
    println!("🚀 Starting backend using start_backend.bat...");
    
    let app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let install_path = app_data.join("VisualPIIStripper");
    let startup_script = install_path.join("start_backend.bat");
    
    println!("📁 Install path: {:?}", install_path);
    println!("📜 Startup script: {:?} (exists: {})", startup_script, startup_script.exists());
    
    if !startup_script.exists() {
        return Err("Backend not installed or startup script not found".to_string());
    }
    
    // Start the backend using the start_backend.bat file in background
    println!("🚀 Executing start_backend.bat...");
    let _child = Command::new("cmd")
        .args(["/C", startup_script.to_str().unwrap()])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW flag
        .spawn()
        .map_err(|e| format!("Failed to start backend: {}", e))?;
    
    Ok("Backend started successfully using start_backend.bat".to_string())
}

#[tauri::command]
async fn start_backend_with_logs(window: tauri::Window) -> Result<String, String> {
    println!("🚀 Starting backend with log streaming...");
    
    let app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let install_path = app_data.join("VisualPIIStripper");
    let backend_dir = install_path.join("backend");
    let python_runtime_dir = install_path.join("python-runtime");
    let python_exe = python_runtime_dir.join("python.exe");
    let app_py = backend_dir.join("app.py");
    
    println!("📁 Install path: {:?}", install_path);
    println!("📁 Backend dir: {:?}", backend_dir);
    println!("🐍 Python exe: {:?} (exists: {})", python_exe, python_exe.exists());
    println!("📄 App.py: {:?} (exists: {})", app_py, app_py.exists());
    
    if !python_exe.exists() {
        return Err("Python runtime not found in installation".to_string());
    }
    
    if !app_py.exists() {
        return Err("Backend app.py not found in installation".to_string());
    }
    
    // Set environment variables and start the backend in background
    let mut cmd = Command::new(&python_exe);
    cmd.arg(&app_py)
        .current_dir(&backend_dir)
        .env("VISUAL_PII_INSTALL_DIR", &install_path)
        .env("PYTHONPATH", format!("{};{}", backend_dir.to_string_lossy(), std::env::var("PYTHONPATH").unwrap_or_default()))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    // Hide console window on Windows
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    
    println!("🚀 Starting backend process...");
    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to start backend: {}", e))?;
    
    let pid = child.id();
    println!("✅ Backend process started with PID: {}", pid);
    
    // Stream stdout logs
    if let Some(stdout) = child.stdout.take() {
        let window_clone = window.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let log_message = format!("[STDOUT] {}", line);
                    println!("{}", log_message);
                    let _ = window_clone.emit("backend-log", &log_message);
                }
            }
        });
    }
    
    // Stream stderr logs
    if let Some(stderr) = child.stderr.take() {
        let window_clone = window.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    let log_message = format!("[STDERR] {}", line);
                    println!("{}", log_message);
                    let _ = window_clone.emit("backend-log", &log_message);
                }
            }
        });
    }
    
    // Don't wait for the child process to finish
    // Let it run in the background
    
    Ok(format!("Backend started with log streaming (PID: {})", pid))
}

#[tauri::command]
async fn start_backend_direct() -> Result<String, String> {
    println!("🚀 Starting backend directly...");
    
    let app_data = dirs::data_local_dir()
        .ok_or("Could not find local app data directory")?;
    let install_path = app_data.join("VisualPIIStripper");
    let backend_dir = install_path.join("backend");
    let python_runtime_dir = install_path.join("python-runtime");
    let python_exe = python_runtime_dir.join("python.exe");
    let app_py = backend_dir.join("app.py");
    let venv_site_packages = install_path.join("venv").join("Lib").join("site-packages");
    
    println!("📁 Install path: {:?}", install_path);
    println!("📁 Backend dir: {:?}", backend_dir);
    println!("🐍 Python exe: {:?} (exists: {})", python_exe, python_exe.exists());
    println!("📄 App.py: {:?} (exists: {})", app_py, app_py.exists());
    println!("📦 Venv site-packages: {:?} (exists: {})", venv_site_packages, venv_site_packages.exists());
    
    if !python_exe.exists() {
        return Err(format!("Python runtime not found at: {:?}", python_exe));
    }
    
    if !app_py.exists() {
        return Err(format!("Backend not installed or app.py not found at: {:?}", app_py));
    }
    
    // We don't need bundled Python since we use the installed runtime
    
    // Start the backend directly using installed Python runtime with proper PYTHONPATH
    let pythonpath = format!("{};{}", 
        backend_dir.to_string_lossy(),
        std::env::var("PYTHONPATH").unwrap_or_default()
    );
    
    println!("🔧 Setting PYTHONPATH: {}", pythonpath);
    println!("🔧 Setting VISUAL_PII_INSTALL_DIR: {:?}", install_path);
    println!("🔧 Working directory: {:?}", backend_dir);
    
    let mut cmd = Command::new(&python_exe);
    cmd.arg(&app_py)
        .current_dir(&backend_dir)
        .env("VISUAL_PII_INSTALL_DIR", &install_path)
        .env("PYTHONPATH", pythonpath)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    // Hide console window on Windows
    #[cfg(windows)]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW flag
    
    println!("🚀 Executing command: {:?} {:?}", python_exe, app_py);
    
    let child = cmd.spawn()
        .map_err(|e| format!("Failed to start backend directly: {}", e))?;
    
    println!("✅ Backend process started with PID: {:?}", child.id());
    
    Ok(format!("Backend started using installed Python runtime (PID: {:?})", child.id()))
}

#[tauri::command]
async fn check_backend_running() -> Result<bool, String> {
    // Try to connect to the backend
    let client = reqwest::Client::new();
    match client.get("http://localhost:8000/").send().await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
async fn test_resources() -> Result<String, String> {
    println!("🧪 Testing resource access...");
    
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Could not get current exe path: {}", e))?;
    let exe_dir = exe_path.parent().ok_or("Could not get parent directory")?;
    
    let mut result = format!("Exe path: {:?}\n", exe_path);
    result.push_str(&format!("Exe dir: {:?}\n", exe_dir));
    
    // Check for resources directory
    let resources_dir = exe_dir.join("resources");
    result.push_str(&format!("Resources dir: {:?} (exists: {})\n", resources_dir, resources_dir.exists()));
    
    if resources_dir.exists() {
        result.push_str("Files in resources directory:\n");
        if let Ok(entries) = fs::read_dir(&resources_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    result.push_str(&format!("  - {:?}\n", entry.file_name()));
                }
            }
        }
        
        // Check for api directory
        let api_dir = resources_dir.join("api");
        result.push_str(&format!("API dir: {:?} (exists: {})\n", api_dir, api_dir.exists()));
        
        if api_dir.exists() {
            // Check for installer directory
            let installer_dir = api_dir.join("installer");
            result.push_str(&format!("Installer dir: {:?} (exists: {})\n", installer_dir, installer_dir.exists()));
            
            if installer_dir.exists() {
                // Check for dist directory
                let dist_dir = installer_dir.join("dist");
                result.push_str(&format!("Dist dir: {:?} (exists: {})\n", dist_dir, dist_dir.exists()));
                
                if dist_dir.exists() {
                    // Check for setup_installer.exe
                    let installer_exe = dist_dir.join("setup_installer.exe");
                    result.push_str(&format!("Installer exe: {:?} (exists: {})\n", installer_exe, installer_exe.exists()));
                }
            }
        }
    }
    
    // Also check for installer in exe directory (new approach)
    result.push_str("\n=== NEW APPROACH: Installer in exe directory ===\n");
    let installer_in_exe_dir = exe_dir.join("setup_installer.exe");
    result.push_str(&format!("Installer in exe dir: {:?} (exists: {})\n", installer_in_exe_dir, installer_in_exe_dir.exists()));
    
    Ok(result)
}

#[tauri::command]
async fn auto_setup_on_first_run() -> Result<String, String> {
    println!("🎯 Auto-setup on first run started");
    
    // Check if backend is already installed
    println!("🔍 Checking if backend is already installed...");
    match check_backend_installed().await {
        Ok(true) => {
            println!("✅ Backend already installed, ready to use");
            // Backend already installed, frontend will handle starting it
            Ok("Backend is installed and ready. Frontend will start the server.".to_string())
        },
        Ok(false) => {
            println!("📦 Backend not installed, starting installation...");
            // Backend not installed, install it automatically using setup_installer.exe
            match install_backend().await {
                Ok(_install_msg) => {
                    println!("✅ Installation completed, now starting backend with logs...");
                    // After successful installation, start the backend
                    match start_backend().await {
                        Ok(_start_msg) => {
                            println!("✅ Backend started after installation");
                            Ok(format!("Installation completed! Backend is now running."))
                        },
                        Err(e) => {
                            println!("❌ Failed to start backend after installation: {}", e);
                            Err(format!("Installation completed but failed to start backend: {}", e))
                        }
                    }
                },
                Err(e) => {
                    println!("❌ Installation failed: {}", e);
                    Err(format!("Auto-installation failed: {}", e))
                }
            }
        },
        Err(e) => {
            println!("❌ Failed to check backend status: {}", e);
            Err(format!("Failed to check backend status: {}", e))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_backend_installed,
            install_backend,
            start_backend,
            start_backend_with_logs,
            start_backend_direct,
            check_backend_running,
            test_resources,
            auto_setup_on_first_run
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
