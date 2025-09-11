import { Button } from "@/components/ui/button";
import { Loader2, Zap, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessButtonProps {
  onProcess: () => void;
  isProcessing: boolean;
  disabled: boolean;
}

export const ProcessButton = ({ onProcess, isProcessing, disabled }: ProcessButtonProps) => {
  return (
    <div className="text-center space-y-4">
      <Button
        onClick={onProcess}
        disabled={disabled || isProcessing}
        size="lg"
        className={cn(
          "px-8 py-6 text-lg font-semibold shadow-lg transition-all duration-300",
          "bg-gradient-primary hover:shadow-xl hover:scale-105",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
            Processing Document...
          </>
        ) : (
          <>
            <Zap className="w-6 h-6 mr-2" />
            Process Document
          </>
        )}
      </Button>

      {disabled && !isProcessing && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-1 h-1 rounded-full bg-muted-foreground" />
          <span>Upload an image and select filters to continue</span>
        </div>
      )}

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-primary">
            <Download className="w-4 h-4" />
            <span>Your processed document will download automatically</span>
          </div>
          <div className="w-64 mx-auto bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}
    </div>
  );
};