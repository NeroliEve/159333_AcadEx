"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

type ThemeOption = (typeof themeOptions)[number]["value"];

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

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: ThemeOption }) {
  if (theme === "light") {
    return <SunIcon />;
  }

  if (theme === "dark") {
    return <MoonIcon />;
  }

  return <SystemIcon />;
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const currentTheme = themeOptions.some((option) => option.value === theme) ? (theme as ThemeOption) : "system";
  const currentThemeLabel = themeOptions.find((option) => option.value === currentTheme)?.label ?? "System";

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
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        aria-label={`Theme: ${currentThemeLabel}. Choose theme`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent"
        onClick={() => setIsOpen((open) => !open)}
      >
        <ThemeIcon theme={currentTheme} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Choose theme"
          className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {themeOptions.map((option) => {
            const isSelected = option.value === currentTheme;

            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
              >
                <ThemeIcon theme={option.value} />
                <span className="flex-1">{option.label}</span>
                <span className="flex h-4 w-4 items-center justify-center">{isSelected ? <CheckIcon /> : null}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
