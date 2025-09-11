import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image as ImageIcon, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
}

export const ImageUpload = ({ onImageSelect, selectedImage }: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      onImageSelect(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.bmp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const clearImage = () => {
    setPreview(null);
    // Note: We don't have a callback to clear the selected image in the parent
    // You might want to add an onImageClear callback prop
  };

  return (
    <div className="h-full flex flex-col space-y-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-base font-semibold text-foreground">Upload Document</h3>
          <p className="text-xs text-muted-foreground">
            Select a healthcare document image for processing
          </p>
        </div>
        {selectedImage && (
          <div className="flex items-center gap-2 px-2 py-1 bg-success-light rounded-full">
            <CheckCircle className="w-3 h-3 text-success" />
            <span className="text-xs font-medium text-success">Ready</span>
          </div>
        )}
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer flex-1 min-h-0",
          "hover:border-primary hover:bg-upload-active",
          isDragActive 
            ? "border-primary bg-upload-active scale-[1.02]" 
            : selectedImage 
              ? "border-success bg-success-light" 
              : "border-upload-border bg-upload-bg",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="p-6 text-center h-full flex flex-col items-center justify-center">
          {preview && (
            // Small Preview Box
            <div className="mb-4 relative">
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg shadow-md border-2 border-success"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
              >
                <X className="w-3 h-3" />
              </Button>
              <div className="mt-2 text-center">
                <p className="text-xs font-medium text-foreground truncate max-w-32">{selectedImage?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedImage && (selectedImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}
          
          <div className="mx-auto w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mb-4">
            {isDragActive ? (
              <Upload className="w-6 h-6 text-primary animate-bounce" />
            ) : (
              <ImageIcon className="w-6 h-6 text-primary" />
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="text-base font-semibold text-foreground">
              {isDragActive ? "Drop your image here" : preview ? "Upload another document" : "Upload healthcare document"}
            </h4>
            <p className="text-xs text-muted-foreground">
              Drag & drop an image file, or{" "}
              <span className="font-medium text-primary">click to browse</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: JPEG, PNG, WebP, GIF, BMP (max 10MB)
            </p>
          </div>
        </div>

        {/* Drag Overlay */}
        {isDragActive && (
          <div className="absolute inset-0 bg-primary/10 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Upload className="w-8 h-8 text-primary mx-auto mb-2 animate-bounce" />
              <p className="text-sm font-semibold text-primary">Drop to upload</p>
            </div>
          </div>
        )}
      </div>

      {!selectedImage && (
        <div className="text-center flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click?.()}
            className="inline-flex items-center gap-2"
          >
            <Upload className="w-3 h-3" />
            Choose File
          </Button>
        </div>
      )}
    </div>
  );
};