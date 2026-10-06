"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type WidthToggleProps = {
  fullWidth: boolean;
  onToggle: () => void;
};

export function WidthToggle({ fullWidth, onToggle }: WidthToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={fullWidth ? "Use reading width" : "Use full width"}
      title={fullWidth ? "Reading width" : "Full width"}
      onClick={onToggle}
    >
      {fullWidth ? (
        <Minimize2 className="size-4" />
      ) : (
        <Maximize2 className="size-4" />
      )}
    </Button>
  );
}
