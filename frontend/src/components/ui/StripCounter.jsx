import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ShadcnButton";

export function StripCounter({ value, onChange, min = 1, label = '' }) {
  return (
    <div className="inline-flex -space-x-px rounded-full shadow-sm shadow-black/5 rtl:space-x-reverse">
      <Button
        className="rounded-none shadow-none first:rounded-s-full last:rounded-e-full focus-visible:z-10"
        size="icon"
        variant="outline"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease"
      >
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
      </Button>
      <span className="flex items-center bg-primary px-3 text-sm font-medium text-primary-foreground select-none whitespace-nowrap min-w-[3rem] justify-center">
        {value} {label}
      </span>
      <Button
        className="rounded-none shadow-none first:rounded-s-full last:rounded-e-full focus-visible:z-10"
        size="icon"
        variant="outline"
        onClick={() => onChange(value + 1)}
        aria-label="Increase"
      >
        <ChevronUp size={16} strokeWidth={2} aria-hidden="true" />
      </Button>
    </div>
  );
}
