import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface BackendStatus {
  installed: boolean;
  running: boolean;
  installing: boolean;
  starting: boolean;
  error: string | null;
}

export const useBackendManager = () => {
  const [status, setStatus] = useState<BackendStatus>({
    installed: false,
    running: false,
    installing: false,
    starting: false,
    error: null,
  });

  const checkBackendInstalled = async (): Promise<boolean> => {
    try {
      const installed = await invoke<boolean>('check_backend_installed');
      setStatus(prev => ({ ...prev, installed, error: null }));
      return installed;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setStatus(prev => ({ ...prev, error: errorMsg }));
      return false;
    }
  };

  const checkBackendRunning = async (): Promise<boolean> => {
    try {
      const running = await invoke<boolean>('check_backend_running');
      setStatus(prev => ({ ...prev, running, error: null }));
      return running;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setStatus(prev => ({ ...prev, error: errorMsg }));
      return false;
    }
  };

  const installBackend = async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, installing: true, error: null }));
    
    try {
      const result = await invoke<string>('install_backend');
      console.log('Installation result:', result);
      
      // Check if installation was successful
      const installed = await checkBackendInstalled();
      setStatus(prev => ({ ...prev, installing: false, installed }));
      
      return installed;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Installation failed';
      setStatus(prev => ({ 
        ...prev, 
        installing: false, 
        error: errorMsg 
      }));
      return false;
    }
  };

  const startBackend = async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, starting: true, error: null }));
    
    try {
      await invoke<string>('start_backend');
      
      // Wait a moment for the backend to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if backend is running
      const running = await checkBackendRunning();
      setStatus(prev => ({ ...prev, starting: false, running }));
      
      return running;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to start backend';
      setStatus(prev => ({ 
        ...prev, 
        starting: false, 
        error: errorMsg 
      }));
      return false;
    }
  };

  const initializeBackend = async () => {
    // Check if backend is installed
    const installed = await checkBackendInstalled();
    
    if (!installed) {
      // Install backend if not installed
      const installSuccess = await installBackend();
      if (!installSuccess) {
        return;
      }
    }
    
    // Check if backend is running
    const running = await checkBackendRunning();
    
    if (!running) {
      // Start backend if not running
      await startBackend();
    }
  };

  useEffect(() => {
    // Initialize backend on component mount
    initializeBackend();
    
    // Set up periodic health checks
    const interval = setInterval(async () => {
      if (status.installed && !status.installing && !status.starting) {
        await checkBackendRunning();
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  return {
    status,
    checkBackendInstalled,
    checkBackendRunning,
    installBackend,
    startBackend,
    initializeBackend,
  };
};
