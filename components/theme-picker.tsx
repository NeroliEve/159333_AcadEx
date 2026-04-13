"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { PillButton } from "@/components/ui/pill-button";

const themes = ["light", "dark", "system"] as const;

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1">
        {themes.map((item) => (
          <div
            key={item}
            className="h-8 w-16 animate-pulse rounded-full bg-muted/60"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1">
      {themes.map((item) => {
        const active = theme === item;

        return (
          <PillButton
            key={item}
            type="button"
            size="sm"
            variant={active ? "primary" : "secondary"}
            className="h-8 px-3 text-xs font-semibold capitalize"
            onClick={() => setTheme(item)}
          >
            {item}
          </PillButton>
        );
      })}
    </div>
  );
}