import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, VStack, HStack, Button } from '@chakra-ui/react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface BackendLogViewerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const BackendLogViewer: React.FC<BackendLogViewerProps> = ({ isVisible, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Silent notifications - just log to console instead of showing alerts
  const showToast = (title: string, description: string, status: 'success' | 'error') => {
    console.log(`${status.toUpperCase()}: ${title} - ${description}`);
  };

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Listen for backend logs
  useEffect(() => {
    if (!isVisible) return;

    const setupLogListener = async () => {
      try {
        // Listen for backend log events
        const unlisten = await listen('backend-log', (event) => {
          const logMessage = event.payload as string;
          setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${logMessage}`]);
        });

        return unlisten;
      } catch (error) {
        console.error('Failed to setup log listener:', error);
      }
    };

    let unlisten: (() => void) | undefined;
    setupLogListener().then(fn => unlisten = fn);

    return () => {
      if (unlisten) unlisten();
    };
  }, [isVisible]);

  const startBackendWithLogs = async () => {
    try {
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Starting backend with log streaming...`]);
      const result = await invoke('start_backend_with_logs') as string;
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${result}`]);
      showToast('Backend Started', 'Backend started with log streaming', 'success');
    } catch (error) {
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Error: ${error}`]);
      showToast('Error', `Failed to start backend: ${error}`, 'error');
    }
  };

  const startBackendConsole = async () => {
    try {
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Starting backend with console...`]);
      const result = await invoke('start_backend') as string;
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${result}`]);
      showToast('Backend Started', 'Backend started with console window', 'success');
    } catch (error) {
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - Error: ${error}`]);
      showToast('Error', `Failed to start backend: ${error}`, 'error');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isVisible) return null;

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      width="500px"
      height="400px"
      bg="gray.900"
      color="white"
      borderRadius="md"
      boxShadow="xl"
      zIndex={1000}
      border="1px solid"
      borderColor="gray.600"
    >
      <VStack height="100%">
        {/* Header */}
        <HStack
          width="100%"
          p={3}
          bg="gray.800"
          borderTopRadius="md"
          justifyContent="space-between"
        >
          <Text fontWeight="bold" fontSize="sm">
            Backend Logs
          </Text>
          <HStack gap={2}>
            <Button size="xs" onClick={startBackendWithLogs} colorScheme="blue">
              Start (Logs)
            </Button>
            <Button size="xs" onClick={startBackendConsole} colorScheme="green">
              Start (Console)
            </Button>
            <Button size="xs" onClick={clearLogs} variant="outline">
              Clear
            </Button>
            <Button size="xs" onClick={onClose} variant="ghost">
              ×
            </Button>
          </HStack>
        </HStack>

        {/* Log content */}
        <Box
          flex={1}
          width="100%"
          overflowY="auto"
          p={3}
          fontFamily="mono"
          fontSize="xs"
          lineHeight="1.4"
        >
          {logs.length === 0 ? (
            <Text color="gray.400" textAlign="center" mt={8}>
              No logs yet. Click "Start (Logs)" to begin backend with log streaming.
            </Text>
          ) : (
            logs.map((log, index) => (
              <Text
                key={index}
                mb={1}
                color={
                  log.includes('[STDERR]') ? 'red.300' :
                  log.includes('[STDOUT]') ? 'green.300' :
                  log.includes('Error') ? 'red.400' :
                  'white'
                }
              >
                {log}
              </Text>
            ))
          )}
          <div ref={logEndRef} />
        </Box>
      </VStack>
    </Box>
  );
};
