import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { FilterPanel } from "@/components/FilterPanel";
import { ProcessButton } from "@/components/ProcessButton";
import { Shield, FileText } from "lucide-react";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([
    "Name",
    "Address",
    "Date of Birth",
    "Mobile Number",
    "Email",
    "Photo",
    "Fingerprint",
    "Signature",
    "QR & Barcodes",
    "PAN",
    "AADHAR Number",
    "Passport",
    "ABHA (Health Id)",
    "Voter ID"
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file);
    toast({
      title: "Image uploaded successfully",
      description: `Selected ${file.name}`,
    });
  }, []);

  const handleFilterChange = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    if (selectedFilters.length === 0) {
      toast({
        title: "No filters selected",
        description: "Please select at least one filter",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create FormData for the API request
      const formData = new FormData();
      formData.append("file", selectedImage);
      formData.append("filters", JSON.stringify(selectedFilters));

      // TODO: Replace with your actual API endpoint
      const response = await fetch(`${import.meta.env.VITE_APU_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Processing failed");
      }

      // Get the JSON response with base64 image
      const result = await response.json();
      
      // Convert base64 to blob
      const base64Data = result.blurred_image;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `processed-${selectedImage.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Processing complete",
        description: "Your processed document has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "There was an error processing your document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, selectedFilters]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-primary text-primary-foreground">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Visual PII Stripper</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-4 h-full">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
          
            {/* Processing Interface */}
            <div className="flex-1 grid lg:grid-cols-3 gap-6 min-h-0">
              {/* Image Upload */}
              <div className="lg:col-span-2">
                <ImageUpload 
                  onImageSelect={handleImageSelect}
                  selectedImage={selectedImage}
                />
              </div>

              {/* Filter Panel */}
              <div className="lg:col-span-1">
                <FilterPanel
                  selectedFilters={selectedFilters}
                  onFilterChange={handleFilterChange}
                />
              </div>
            </div>

            {/* Process Button */}
            <div className="mt-4 flex justify-center flex-shrink-0">
              <ProcessButton 
                onProcess={handleProcess}
                isProcessing={isProcessing}
                disabled={!selectedImage || selectedFilters.length === 0}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;