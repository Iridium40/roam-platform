import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  showClearButton?: boolean;
}

/**
 * Search input with debounce support
 * 
 * @param value - Controlled value (optional)
 * @param onSearch - Callback fired after debounce delay
 * @param placeholder - Input placeholder text
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @param className - Additional CSS classes
 * @param showClearButton - Show clear button when input has value (default: true)
 */
export function SearchInput({
  value: controlledValue,
  onSearch,
  placeholder = "Search...",
  debounceMs = 300,
  className,
  showClearButton = true,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(controlledValue || "");
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync internal value with controlled value
  React.useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      onSearch(newValue);
    }, debounceMs);
  };

  const handleClear = () => {
    setInternalValue("");
    onSearch("");
    
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Immediate search on Enter
    if (e.key === "Enter") {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onSearch(internalValue);
    }
    // Clear on Escape
    if (e.key === "Escape") {
      handleClear();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {showClearButton && internalValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
