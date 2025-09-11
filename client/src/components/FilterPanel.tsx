import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  selectedFilters: string[];
  onFilterChange: (filters: string[]) => void;
}

const FILTER_OPTIONS = [
  { id: "Name", label: "Name", category: "Personal" },
  { id: "Address", label: "Address", category: "Personal" },
  { id: "Date of Birth", label: "Date of Birth", category: "Personal" },
  { id: "Mobile Number", label: "Mobile Number", category: "Contact" },
  { id: "Email", label: "Email", category: "Contact" },
  { id: "Photo", label: "Photo", category: "Biometric" },
  { id: "Fingerprint", label: "Fingerprint", category: "Biometric" },
  { id: "Signature", label: "Signature", category: "Biometric" },
  { id: "QR & Barcodes", label: "QR & Barcodes", category: "Codes" },
  { id: "PAN", label: "PAN", category: "Identity" },
  { id: "AADHAR Number", label: "AADHAR Number", category: "Identity" },
  { id: "Passport", label: "Passport", category: "Identity" },
  { id: "ABHA (Health Id)", label: "ABHA (Health Id)", category: "Healthcare" },
  { id: "Voter ID", label: "Voter ID", category: "Identity" },
];

const CATEGORIES = [
  { id: "Personal", label: "Personal Info", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "Contact", label: "Contact", color: "bg-green-50 text-green-700 border-green-200" },
  { id: "Biometric", label: "Biometric", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "Codes", label: "Codes", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "Identity", label: "Identity", color: "bg-red-50 text-red-700 border-red-200" },
  { id: "Healthcare", label: "Healthcare", color: "bg-teal-50 text-teal-700 border-teal-200" },
];

export const FilterPanel = ({ selectedFilters, onFilterChange }: FilterPanelProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const handleFilterToggle = (filterId: string) => {
    const newFilters = selectedFilters.includes(filterId)
      ? selectedFilters.filter(f => f !== filterId)
      : [...selectedFilters, filterId];
    
    onFilterChange(newFilters);
  };

  const handleSelectAll = () => {
    onFilterChange(FILTER_OPTIONS.map(option => option.id));
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? [] // Close the currently open category
        : [categoryId] // Open only the clicked category, close all others
    );
  };

  const getCategoryFilters = (categoryId: string) => {
    return FILTER_OPTIONS.filter(option => option.category === categoryId);
  };

  const getCategorySelectedCount = (categoryId: string) => {
    const categoryFilters = getCategoryFilters(categoryId);
    return categoryFilters.filter(option => selectedFilters.includes(option.id)).length;
  };

  return (
    <Card className="h-full shadow-md flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Data Filters</CardTitle>
          </div>
          <Badge variant="secondary" className="px-2 py-1 text-xs">
            {selectedFilters.length}/{FILTER_OPTIONS.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Select the data fields to extract from your document
        </p>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 overflow-auto">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="flex-1"
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-1" />
            None
          </Button>
        </div>

        {/* Filter Categories */}
        <div className="space-y-3">
          {CATEGORIES.map(category => {
            const categoryFilters = getCategoryFilters(category.id);
            const selectedCount = getCategorySelectedCount(category.id);
            const isExpanded = expandedCategories.includes(category.id);

            return (
              <div key={category.id} className="border rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", category.color)}
                    >
                      {category.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {selectedCount}/{categoryFilters.length}
                    </span>
                  </div>
                  <div className={cn(
                    "text-xs transition-transform",
                    isExpanded ? "rotate-180" : ""
                  )}>
                    ▼
                  </div>
                </button>

                {/* Category Filters */}
                {isExpanded && (
                  <div className="p-3 space-y-2 bg-card">
                    {categoryFilters.map(option => (
                      <div key={option.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={option.id}
                          checked={selectedFilters.includes(option.id)}
                          onCheckedChange={() => handleFilterToggle(option.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label
                          htmlFor={option.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 p-2 bg-primary-light rounded-lg flex-shrink-0">
          <p className="text-xs font-medium text-primary">
            {selectedFilters.length === 0 
              ? "No filters selected" 
              : selectedFilters.length === FILTER_OPTIONS.length
                ? "All filters selected"
                : `${selectedFilters.length} filter${selectedFilters.length !== 1 ? 's' : ''} selected`
            }
          </p>
          {selectedFilters.length > 0 && selectedFilters.length < FILTER_OPTIONS.length && (
            <p className="text-xs text-primary/70 mt-1">
              Only selected data will be extracted and processed
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};