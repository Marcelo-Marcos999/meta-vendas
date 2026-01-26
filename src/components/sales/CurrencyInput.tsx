import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/goalCalculations";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  className?: string;
}

export function CurrencyInput({ value, onChange, onBlur, className }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number when focused for easier editing
    setDisplayValue(value === 0 ? "" : String(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numericValue = parseFloat(displayValue.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    setDisplayValue(formatCurrency(numericValue));
    // Only call onChange and onBlur if value actually changed
    if (numericValue !== value) {
      onChange(numericValue);
      // Use setTimeout to ensure state update completes before triggering recalculation
      setTimeout(() => {
        onBlur?.();
      }, 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow only numbers, comma and dot
    const sanitized = rawValue.replace(/[^\d.,]/g, "");
    setDisplayValue(sanitized);
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      inputMode="decimal"
    />
  );
}
