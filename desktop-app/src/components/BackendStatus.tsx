import React from 'react';
import {
  Box,
  Text,
  Spinner,
  Button,
  Stack,
  Badge,
} from '@chakra-ui/react';
import { useBackendManager } from '../hooks/useBackendManager';

export const BackendStatus: React.FC = () => {
  const { status, installBackend, startBackend, initializeBackend } = useBackendManager();

  const getStatusColor = () => {
    if (status.error) return 'red';
    if (status.installing || status.starting) return 'yellow';
    if (status.installed && status.running) return 'green';
    return 'gray';
  };

  const getStatusText = () => {
    if (status.error) return 'Error';
    if (status.installing) return 'Installing Backend...';
    if (status.starting) return 'Starting Backend...';
    if (!status.installed) return 'Backend Not Installed';
    if (!status.running) return 'Backend Not Running';
    return 'Backend Ready';
  };

  const showInstallationProgress = status.installing || status.starting;
  const showError = !!status.error;
  const showActions = !status.installing && !status.starting && (!status.installed || !status.running);

  return (
    <Box p={4} borderWidth={1} borderRadius="md" bg="white" shadow="sm">
      <Stack gap={3} align="stretch">
        <Stack direction="row" justify="space-between">
          <Text fontSize="lg" fontWeight="semibold">
            Backend Status
          </Text>
          <Badge colorPalette={getStatusColor()} variant="solid">
            {getStatusText()}
          </Badge>
        </Stack>

        {showInstallationProgress && (
          <Box>
            <Stack direction="row" gap={2} mb={2}>
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.600">
                {status.installing ? 'Installing backend components...' : 'Starting backend server...'}
              </Text>
            </Stack>
            <Box 
              w="100%" 
              h="2px" 
              bg="blue.100" 
              borderRadius="full" 
              overflow="hidden"
              position="relative"
            >
              <Box
                h="100%"
                w="30%"
                bg="blue.500"
                borderRadius="full"
                position="absolute"
                style={{
                  animation: 'loading 2s ease-in-out infinite',
                }}
              />
              <style>
                {`
                  @keyframes loading {
                    0% { left: -30%; }
                    50% { left: 50%; }
                    100% { left: 100%; }
                  }
                `}
              </style>
            </Box>
            <Text fontSize="xs" color="gray.500" mt={1}>
              This may take a few minutes on first run
            </Text>
          </Box>
        )}

        {showError && (
          <Box p={3} bg="red.50" borderRadius="md" borderLeft="4px solid" borderColor="red.500">
            <Text fontSize="sm" fontWeight="semibold" color="red.700">
              Backend Error
            </Text>
            <Text fontSize="xs" color="red.600">
              {status.error}
            </Text>
          </Box>
        )}

        {showActions && (
          <Stack direction="row" gap={2}>
            {!status.installed && (
              <Button
                size="sm"
                colorPalette="blue"
                onClick={installBackend}
                loading={status.installing}
              >
                {status.installing ? 'Installing...' : 'Install Backend'}
              </Button>
            )}
            
            {status.installed && !status.running && (
              <Button
                size="sm"
                colorPalette="green"
                onClick={startBackend}
                loading={status.starting}
              >
                {status.starting ? 'Starting...' : 'Start Backend'}
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={initializeBackend}
              disabled={status.installing || status.starting}
            >
              Retry
            </Button>
          </Stack>
        )}

        <Box fontSize="xs" color="gray.500">
          <Text>Installed: {status.installed ? '✓' : '✗'}</Text>
          <Text>Running: {status.running ? '✓' : '✗'}</Text>
        </Box>
      </Stack>
    </Box>
  );
};
