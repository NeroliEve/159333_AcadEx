"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const themeOrder = ["light", "dark", "system"] as const;

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 19h8M10 17v2M14 17v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme ?? "system";

  function cycleTheme() {
    const currentIndex = themeOrder.indexOf(currentTheme as (typeof themeOrder)[number]);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
  }

  const icon = currentTheme === "light" ? <SunIcon /> : currentTheme === "dark" ? <MoonIcon /> : <SystemIcon />;

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Theme selector loading"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm"
      >
        <span className="h-4 w-4 animate-pulse rounded-full bg-muted" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Theme: ${currentTheme}. Switch theme`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent"
      onClick={cycleTheme}
    >
      {icon}
    </button>
  );
}