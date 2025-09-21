import { useState, useEffect, useRef } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, readDir, mkdir, exists } from "@tauri-apps/plugin-fs";
import { downloadDir } from "@tauri-apps/api/path";
import { BackendLogViewer } from "./components/BackendLogViewer";
import { useAutoSetup } from "./hooks/useAutoSetup";
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Progress,
  Text,
  VStack,
  Divider,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import {
  FiFile,
  FiFolder,
  FiPlay,
  FiLoader,
  FiCheckCircle,
  FiShield,
  FiEye,
  FiEdit3,
  FiCamera,
  FiHash,
  FiCreditCard,
  FiMail,
  FiPhone,
  FiCalendar,
  FiMapPin,
  FiUser,
} from "react-icons/fi";

interface PIIFilters {
  [key: string]: boolean;
}

async function processBatchFolder(
  inputFolder: string,
  outputFolder: string,
  filters: PIIFilters,
  setIsBatchProcessing: (loading: boolean) => void,
  setBatchProgress: (progress: { current: number; total: number }) => void,
  showToast: (message: string, status: "success" | "error" | "info") => void
) {
  try {
    setIsBatchProcessing(true);

    const entries = await readDir(inputFolder);
    const imageExtensions = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];
    const imageFiles = entries.filter(
      (entry) =>
        entry.isFile &&
        imageExtensions.some((ext) =>
          entry.name.toLowerCase().endsWith(`.${ext}`)
        )
    );

    if (imageFiles.length === 0) {
      showToast("No image files found in the selected folder.", "error");
      return;
    }

    showToast(
      `Starting batch processing of ${imageFiles.length} images...`,
      "info"
    );
    setBatchProgress({ current: 0, total: imageFiles.length });

    for (let i = 0; i < imageFiles.length; i++) {
      const imageFile = imageFiles[i];
      const inputPath = `${inputFolder}/${imageFile.name}`;

      try {
        const fileBytes = await readFile(inputPath);
        
        // Only send enabled filters to backend
        const enabledFilters = Object.keys(filters).filter(key => filters[key]);
        
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(fileBytes)], { type: "image/*" });
        formData.append("file", blob, imageFile.name);
        formData.append("filters", JSON.stringify(enabledFilters));

        const response = await fetch("http://localhost:8000/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok)
          throw new Error(`Failed to process ${imageFile.name}`);

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        const base64Data = result.blurred_image;
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        const processedBlob = new Blob([bytes], { type: "image/png" });

        const baseName = imageFile.name.split(".")[0];
        const outputPath = `${outputFolder}/processed_${baseName}.png`;
        const arrayBuffer = await processedBlob.arrayBuffer();
        await writeFile(outputPath, new Uint8Array(arrayBuffer));

        setBatchProgress({ current: i + 1, total: imageFiles.length });
      } catch (err) {
        console.error(`Error processing ${imageFile.name}:`, err);
      }
    }

    showToast(
      `Folder processing completed! Processed ${imageFiles.length} images.`,
      "success"
    );
  } catch (err) {
    showToast("Error processing folder: " + err, "error");
  } finally {
    setIsBatchProcessing(false);
    setBatchProgress({ current: 0, total: 0 });
  }
}

async function uploadFileToBackend(
  filePath: string,
  filters: PIIFilters,
  setIsProcessing: (loading: boolean) => void,
  showToast: (message: string, status: "success" | "error" | "info") => void
) {
  try {
    setIsProcessing(true);
    showToast("Processing image...", "info");

    const fileBytes = await readFile(filePath);
    const fileName = filePath.split(/[\\/]/).pop() || "upload.jpg";

    // Only send enabled filters to backend
    const enabledFilters = Object.keys(filters).filter(key => filters[key]);
    console.log("Enabled filters:", enabledFilters);
    
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBytes)], { type: "image/*" });
    formData.append("file", blob, fileName);
    formData.append("filters", JSON.stringify(enabledFilters));

    const response = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload/process file");

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const base64Data = result.blurred_image;
    const binaryString = window.atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const processedBlob = new Blob([bytes], { type: "image/png" });

    const baseName = fileName.split(".")[0] || "processed_image";
    const savePath = await save({
      defaultPath: `processed_${baseName}.png`,
      filters: [
        {
          name: "PNG Images",
          extensions: ["png"],
        },
      ],
    });
    if (savePath) {
      const arrayBuffer = await processedBlob.arrayBuffer();
      await writeFile(savePath as string, new Uint8Array(arrayBuffer));
      showToast("Image processed and saved successfully!", "success");
    }
  } catch (err) {
    showToast("Error uploading or saving processed image: " + err, "error");
  } finally {
    setIsProcessing(false);
  }
}

const MotionBox = motion.div;
const MotionCard = motion.div;

const filterIcons: { [key: string]: any } = {
  Name: FiUser,
  Address: FiMapPin,
  "Date of Birth": FiCalendar,
  "Mobile Number": FiPhone,
  Email: FiMail,
  Photo: FiCamera,
  Fingerprint: FiShield,
  Signature: FiEdit3,
  "QR & Barcodes": FiHash,
  PAN: FiCreditCard,
  "AADHAR Number": FiCreditCard,
  Passport: FiCreditCard,
  "ABHA (Health Id)": FiCreditCard,
  "Voter ID": FiCreditCard,
};

function App() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  const [showLogViewer, setShowLogViewer] = useState(false);
  
  // Auto-setup hook - runs on first launch
  const { isSetupRunning: isAutoSetupRunning, setupMessage: autoSetupMessage, isSetupComplete } = useAutoSetup();
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // 30-second backend startup loading - only after auto-setup completes
  const [isBackendStarting, setIsBackendStarting] = useState<boolean>(false);
  const [startupProgress, setStartupProgress] = useState<number>(0);
  const hasAutoSetupCompleted = useRef<boolean>(false);

  // Start 30-second timer ONLY after auto-setup completes (not on initial load)
  useEffect(() => {
    // Track if auto-setup has completed at least once
    if (isSetupComplete && !hasAutoSetupCompleted.current) {
      hasAutoSetupCompleted.current = true;
    }

    // Start 30-second timer only after auto-setup completes AND stops running
    if (hasAutoSetupCompleted.current && !isAutoSetupRunning && !isBackendStarting) {
      console.log("🚀 Auto-setup completed, starting 30-second backend startup timer...");
      setIsBackendStarting(true);
      
      const startupDuration = 50000; // 30 seconds
      const updateInterval = 100; // Update every 100ms for smooth progress
      const totalSteps = startupDuration / updateInterval;
      let currentStep = 0;

      const progressTimer = setInterval(() => {
        currentStep++;
        const progress = (currentStep / totalSteps) * 100;
        setStartupProgress(progress);

        if (currentStep >= totalSteps) {
          clearInterval(progressTimer);
          setIsBackendStarting(false);
          console.log("✅ Backend startup timer completed");
        }
      }, updateInterval);

      return () => clearInterval(progressTimer);
    }
  }, [isAutoSetupRunning, isSetupComplete]); // Remove isBackendStarting from dependencies to prevent loop

  const [piiFilters, setPiiFilters] = useState<PIIFilters>({
    Name: true,
    Address: true,
    "Date of Birth": true,
    "Mobile Number": true,
    Email: true,
    Photo: true,
    Fingerprint: true,
    Signature: true,
    "QR & Barcodes": true,
    PAN: true,
    "AADHAR Number": true,
    Passport: true,
    "ABHA (Health Id)": true,
    "Voter ID": true,
  });


  const showToast = (
    message: string,
    status: "success" | "error" | "info"
  ) => {
    console.log(`${status.toUpperCase()}: ${message}`);
    if (status === "error") {
      alert(`Error: ${message}`);
    } else if (status === "success") {
      alert(`Success: ${message}`);
    }
  };


  const handleSelectFile = async () => {
    try {
      const file = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Image Files",
            extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp"],
          },
        ],
      });

      if (file) {
        setSelectedFolder(null);
        setOutputFolder(null);
        setSelectedFile(file as string);
        setShowFilters(true);
      }
    } catch (error) {
      console.error("Error selecting file:", error);
    }
  };

  const handleSelectOutputFolder = async () => {
    try {
      const outputDir = await open({
        multiple: false,
        directory: true,
      });

      if (outputDir) {
        setOutputFolder(outputDir as string);
      }
    } catch (error) {
      console.error("Error selecting output folder:", error);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const folder = await open({
        multiple: false,
        directory: true,
      });

      if (folder) {
        setSelectedFile(null);
        setSelectedFolder(folder as string);

        const downloadsPath = await downloadDir();
        const defaultOutputPath = `${downloadsPath}PII_Processed`;

        try {
          const folderExists = await exists(defaultOutputPath);
          if (!folderExists) {
            await mkdir(defaultOutputPath, { recursive: true });
          }
        } catch (err) {
          console.error("Error creating default output folder:", err);
        }

        setOutputFolder(defaultOutputPath);
        setShowFilters(true);
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };

  const handleFilterChange = (filterName: string) => {
    console.log(`Toggling filter: ${filterName}`);
    setPiiFilters((prev) => {
      const newFilters = {
        ...prev,
        [filterName]: !prev[filterName],
      };
      console.log(`Updated filters:`, newFilters);
      return newFilters;
    });
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(piiFilters).every((value) => value);
    const newState = !allSelected;

    setPiiFilters((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = newState;
      });
      return updated;
    });
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <Box
        minH="100vh"
        bgGradient="linear(to-br, gray.50, gray.100)"
        p={8}
        _dark={{ bgGradient: "linear(to-br, gray.900, gray.800)" }}
      >
      <Container maxW="6xl">
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <VStack gap={10} align="stretch">
            {/* Header */}
            <VStack gap={4} textAlign="center">
              <Heading
                size="2xl"
                bgGradient="linear(to-r, teal.400, blue.600)"
                bgClip="text"
                fontWeight="extrabold"
                letterSpacing="tight"
              >
                <FiShield style={{ display: "inline", marginRight: "12px" }} />
                Visual PII Stripper
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="2xl">
                Protect sensitive information by automatically detecting and
                removing PII from images
              </Text>
            </VStack>

            {/* Backend Startup Loading Screen - Shows AFTER auto-setup completes */}
            {isBackendStarting && (
              <MotionCard
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Box
                  bg="whiteAlpha.900"
                  backdropFilter="blur(20px)"
                  shadow="2xl"
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor="blue.200"
                >
                  <Box p={6}>
                    <VStack gap={6} py={8}>
                      <Box position="relative">
                        <FiLoader 
                          size={48} 
                          style={{ 
                            animation: "spin 1s linear infinite",
                            color: "#0967D2" 
                          }} 
                        />
                      </Box>
                      <VStack gap={2} textAlign="center">
                        <Heading size="lg" color="blue.600">
                          Starting Backend Server
                        </Heading>
                        <Text color="gray.600" maxW="md">
                          Initializing AI models and backend services...
                        </Text>
                        <Text fontSize="sm" color="orange.600" fontWeight="semibold" maxW="md" textAlign="center">
                          ⚠️ Please do not close this window. Server startup may take a moment.
                        </Text>
                        <Box w="full" maxW="md" mt={4}>
                          <Progress
                            value={startupProgress}
                            colorScheme="blue"
                            size="lg"
                            borderRadius="full"
                          >
                          </Progress>
                          <Text fontSize="sm" color="gray.500" mt={2} textAlign="center">
                            {Math.round(startupProgress)}% Complete
                          </Text>
                        </Box>
                      </VStack>
                    </VStack>
                  </Box>
                </Box>
              </MotionCard>
            )}

            {/* Auto-Setup Loading Screen */}
            {isAutoSetupRunning && (
              <MotionCard
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Box
                  bg="whiteAlpha.900"
                  backdropFilter="blur(20px)"
                  shadow="2xl"
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor="blue.200"
                >
                  <Box p={6}>
                    <VStack gap={6} py={8}>
                      <Box position="relative">
                        <FiLoader 
                          size={48} 
                          style={{ 
                            animation: "spin 1s linear infinite",
                            color: "#0967D2" 
                          }} 
                        />
                      </Box>
                      <VStack gap={2} textAlign="center">
                        <Heading size="lg" color="blue.600">
                          {autoSetupMessage.includes('starting server') ? 'Starting Backend Server' : 'Setting Up Backend'}
                        </Heading>
                        <Text color="gray.600" maxW="md">
                          {autoSetupMessage}
                        </Text>
                        <Text fontSize="sm" color="orange.600" fontWeight="semibold" maxW="md" textAlign="center">
                          ⚠️ Please do not close this window. {autoSetupMessage.includes('starting server') ? 'Server startup may take a moment.' : 'Downloading models may take a few minutes.'}
                        </Text>
                        <Text fontSize="sm" color="gray.500" mt={4}>
                          Setting up backend components...
                        </Text>
                      </VStack>
                    </VStack>
                  </Box>
                </Box>
              </MotionCard>
            )}


            {/* Selection Buttons - Only show when both setup and startup are complete */}
            {!isAutoSetupRunning && !isBackendStarting && (
              <MotionCard
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Box
                  bg="whiteAlpha.700"
                  backdropFilter="blur(12px)"
                  shadow="xl"
                  borderRadius="2xl"
                >
                  <Box p={6}>
                    <VStack gap={6}>
                      <Heading size="lg" textAlign="center" color="gray.700">
                        Choose Your Input
                      </Heading>
                      <HStack gap={6} justify="center" wrap="wrap">
                        <Button
                          size="lg"
                          onClick={handleSelectFile}
                          bgGradient="linear(to-r, teal.400, blue.500)"
                          color="white"
                          _hover={{ shadow: "xl" }}
                          transition="all 0.3s"
                          disabled={isAutoSetupRunning}
                        >
                          <FiFile style={{ marginRight: "8px" }} />
                          Select File
                        </Button>
                        <Button
                          size="lg"
                          onClick={handleSelectFolder}
                          bgGradient="linear(to-r, purple.400, pink.500)"
                          color="white"
                          _hover={{ shadow: "xl" }}
                          transition="all 0.3s"
                          disabled={isAutoSetupRunning}
                        >
                          <FiFolder style={{ marginRight: "8px" }} />
                          Select Folder
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                </Box>
              </MotionCard>
            )}

            {/* Selection Display */}
            {!isAutoSetupRunning && !isBackendStarting && (selectedFile || selectedFolder) && (
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                whileHover={{ scale: 1.01 }}
              >
                <Box
                  bg="whiteAlpha.700"
                  backdropFilter="blur(12px)"
                  shadow="lg"
                  borderRadius="2xl"
                >
                  <Box p={6}>
                    <VStack gap={4} align="stretch">
                      {selectedFile && (
                        <Box>
                          <Text fontWeight="semibold" mb={2}>
                            Selected File:
                          </Text>
                          <Text
                            p={3}
                            bg="gray.50"
                            borderRadius="md"
                            cursor="pointer"
                            onClick={handleSelectFile}
                            _hover={{ bg: "gray.100" }}
                            transition="background 0.2s"
                            fontSize="sm"
                          >
                            {selectedFile}
                          </Text>
                        </Box>
                      )}

                      {selectedFolder && (
                        <VStack gap={3} align="stretch">
                          <Box>
                            <Text fontWeight="semibold" mb={2}>
                              Input Folder:
                            </Text>
                            <Text
                              p={3}
                              bg="gray.50"
                              borderRadius="md"
                              cursor="pointer"
                              onClick={handleSelectFolder}
                              _hover={{ bg: "gray.100" }}
                              transition="background 0.2s"
                              fontSize="sm"
                            >
                              {selectedFolder}
                            </Text>
                          </Box>
                          {outputFolder && (
                            <Box>
                              <Text fontWeight="semibold" mb={2}>
                                Output Folder:
                              </Text>
                              <Text
                                p={3}
                                bg="gray.50"
                                borderRadius="md"
                                cursor="pointer"
                                onClick={handleSelectOutputFolder}
                                _hover={{ bg: "gray.100" }}
                                transition="background 0.2s"
                                fontSize="sm"
                              >
                                {outputFolder}
                              </Text>
                            </Box>
                          )}
                        </VStack>
                      )}

                      {isBatchProcessing && (
                        <Box>
                          <Text fontWeight="semibold" mb={2}>
                            Processing Progress:
                          </Text>
                          <Text mb={2}>
                            {batchProgress.current} / {batchProgress.total}{" "}
                            images
                          </Text>
                          <Progress
                            value={
                              (batchProgress.current / batchProgress.total) *
                              100
                            }
                            colorScheme="blue"
                            size="lg"
                            borderRadius="full"
                          >
                          </Progress>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                </Box>
              </MotionCard>
            )}

            {/* PII Filters */}
            {!isAutoSetupRunning && !isBackendStarting && showFilters && (
              <MotionCard
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Box
                  bg="whiteAlpha.700"
                  backdropFilter="blur(14px)"
                  shadow="2xl"
                  borderRadius="2xl"
                >
                  <Box p={6}>
                    <VStack gap={6} align="stretch">
                      <Flex justify="space-between" align="center">
                        <Heading size="lg" color="gray.700">
                          PII Detection Filters
                        </Heading>
                        <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                          {Object.values(piiFilters).every((value) => value) ? (
                            <FiCheckCircle style={{ marginRight: "8px" }} />
                          ) : (
                            <FiEye style={{ marginRight: "8px" }} />
                          )}
                          {Object.values(piiFilters).every((value) => value)
                            ? "Deselect All"
                            : "Select All"}
                        </Button>
                      </Flex>

                      <Grid
                        templateColumns="repeat(auto-fit, minmax(300px, 1fr))"
                        gap={6}
                      >
                        {/* Basic Identifiers */}
                        <Box>
                          <Text
                            fontWeight="semibold"
                            mb={4}
                            color="blue.600"
                            fontSize="lg"
                          >
                            Basic Identifiers
                          </Text>
                          <VStack gap={3} align="stretch">
                            {[
                              "Name",
                              "Address",
                              "Date of Birth",
                              "Mobile Number",
                              "Email",
                              "Photo",
                              "Fingerprint",
                              "Signature",
                              "QR & Barcodes",
                            ].map((filter) => {
                              const IconComponent = filterIcons[filter];
                              return (
                                <HStack
                                  key={filter}
                                  gap={2}
                                  p={2}
                                  borderRadius="md"
                                  cursor="pointer"
                                  _hover={{ bg: "gray.50" }}
                                  onClick={() => {
                                    console.log(`Filter clicked: ${filter}`);
                                    handleFilterChange(filter);
                                  }}
                                >
                                  <Box
                                    w={4}
                                    h={4}
                                    borderRadius="sm"
                                    border="2px solid"
                                    borderColor={piiFilters[filter] ? "blue.500" : "gray.300"}
                                    bg={piiFilters[filter] ? "blue.500" : "transparent"}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                  >
                                    {piiFilters[filter] && (
                                      <FiCheckCircle size={12} color="white" />
                                    )}
                                  </Box>
                                  <IconComponent size={16} />
                                  <Text>{filter}</Text>
                                </HStack>
                              );
                            })}
                          </VStack>
                        </Box>

                        {/* Government Identifiers */}
                        <Box>
                          <Text
                            fontWeight="semibold"
                            mb={4}
                            color="purple.600"
                            fontSize="lg"
                          >
                            Government Identifiers
                          </Text>
                          <VStack gap={3} align="stretch">
                            {[
                              "PAN",
                              "AADHAR Number",
                              "Passport",
                              "ABHA (Health Id)",
                              "Voter ID",
                            ].map((filter) => {
                              const IconComponent = filterIcons[filter];
                              return (
                                <HStack
                                  key={filter}
                                  gap={2}
                                  p={2}
                                  borderRadius="md"
                                  cursor="pointer"
                                  _hover={{ bg: "gray.50" }}
                                  onClick={() => {
                                    console.log(`Filter clicked: ${filter}`);
                                    handleFilterChange(filter);
                                  }}
                                >
                                  <Box
                                    w={4}
                                    h={4}
                                    borderRadius="sm"
                                    border="2px solid"
                                    borderColor={piiFilters[filter] ? "purple.500" : "gray.300"}
                                    bg={piiFilters[filter] ? "purple.500" : "transparent"}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                  >
                                    {piiFilters[filter] && (
                                      <FiCheckCircle size={12} color="white" />
                                    )}
                                  </Box>
                                  <IconComponent size={16} />
                                  <Text>{filter}</Text>
                                </HStack>
                              );
                            })}
                          </VStack>
                        </Box>
                      </Grid>

                      <Divider />

                      {/* Action Button */}
                      <Flex justify="center">
                        <Button
                          size="lg"
                          bgGradient="linear(to-r, teal.400, blue.500)"
                          color="white"
                          onClick={() => {
                            if (selectedFile) {
                              uploadFileToBackend(
                                selectedFile,
                                piiFilters,
                                setIsProcessing,
                                showToast
                              );
                            } else if (selectedFolder && outputFolder) {
                              processBatchFolder(
                                selectedFolder,
                                outputFolder,
                                piiFilters,
                                setIsBatchProcessing,
                                setBatchProgress,
                                showToast
                              );
                            }
                          }}
                          disabled={
                            (!selectedFile &&
                              !(selectedFolder && outputFolder)) ||
                            isProcessing ||
                            isBatchProcessing
                          }
                          _hover={{ shadow: "xl" }}
                          transition="all 0.3s"
                        >
                          {isProcessing || isBatchProcessing ? (
                            <FiLoader style={{ marginRight: "8px" }} />
                          ) : (
                            <FiPlay style={{ marginRight: "8px" }} />
                          )}
                          {selectedFolder
                            ? "Start Batch Processing"
                            : "Start Processing"}
                        </Button>
                      </Flex>
                    </VStack>
                  </Box>
                </Box>
              </MotionCard>
            )}
          </VStack>
        </MotionBox>
      </Container>
      
      {/* Backend Status and Log Viewer */}
      {isAutoSetupRunning && (
        <Box
          position="fixed"
          top={4}
          right={4}
          bg="blue.500"
          color="white"
          p={3}
          borderRadius="md"
          boxShadow="lg"
          zIndex={1000}
        >
          <Text fontSize="sm" fontWeight="bold">
            Setting up backend...
          </Text>
          <Text fontSize="xs" mt={1}>
            {autoSetupMessage}
          </Text>
        </Box>
      )}
      
      
      {/* Backend Log Viewer */}
      <BackendLogViewer 
        isVisible={showLogViewer} 
        onClose={() => setShowLogViewer(false)} 
      />
    </Box>
    </>
  );
}

export default App;
