import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export const useAutoSetup = () => {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupRunning, setIsSetupRunning] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');
  
  // Silent notifications - just log to console instead of showing alerts
  const showToast = (title: string, description: string, status: 'success' | 'error') => {
    console.log(`${status.toUpperCase()}: ${title} - ${description}`);
  };

  useEffect(() => {
    checkAndRunSetup();
  }, []);

  const checkAndRunSetup = async () => {
    try {
      // First check if backend is already installed
      console.log("🔍 Checking if backend installation is needed...");
      const isInstalled = await invoke('check_backend_installed') as boolean;
      
      if (isInstalled) {
        console.log("✅ Backend already installed, starting it...");
        setIsSetupRunning(true); // Show loading screen while starting
        setSetupMessage('Backend already installed, starting server...');
        
        // Backend exists, so start it directly
        try {
          const result = await invoke('start_backend') as string;
          console.log("✅ Backend started successfully:", result);
          setSetupMessage('Backend started successfully');
          setIsSetupComplete(true);
        } catch (error) {
          console.error("❌ Failed to start backend:", error);
          setSetupMessage(`Failed to start backend: ${error}`);
        } finally {
          setIsSetupRunning(false); // Hide loading screen
        }
        return;
      }
      
      console.log("📦 Backend not installed, starting setup...");
      await runAutoSetup();
    } catch (error) {
      console.error("❌ Error checking backend status:", error);
      // If check fails, assume setup is needed
      await runAutoSetup();
    }
  };

  const runAutoSetup = async () => {
    setIsSetupRunning(true);
    setSetupMessage('Checking backend installation...');

    try {
      const result = await invoke('auto_setup_on_first_run') as string;
      setSetupMessage(result);
      setIsSetupComplete(true);
      
      showToast('Setup Complete', 'Backend is ready to use', 'success');
    } catch (error) {
      const errorMessage = `Setup failed: ${error}`;
      setSetupMessage(errorMessage);
      
      showToast('Setup Failed', errorMessage, 'error');
    } finally {
      setIsSetupRunning(false);
    }
  };

  return {
    isSetupComplete,
    isSetupRunning,
    setupMessage,
    runAutoSetup,
    checkAndRunSetup,
  };
};
