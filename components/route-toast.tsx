"use client";

import { useEffect, useRef, useState } from "react";

export const LISTING_UPDATED_TOAST_STORAGE_KEY = "acadex:listing-updated-toast";

type RouteToastPayload = {
  text: string;
  type: "error" | "success";
};

type RouteToastProps = RouteToastPayload & {
  onDone?: () => void;
};

export function RouteToast({ onDone, text, type }: RouteToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, 5000);
    const doneTimer = window.setTimeout(() => {
      onDone?.();
    }, 5200);

    return () => {
      window.cancelAnimationFrame(showFrame);
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)] rounded-full px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition-all duration-200 ease-out motion-reduce:transition-none ${
        type === "success"
          ? "border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-950/10"
          : "border border-destructive/20 bg-destructive/5 text-destructive shadow-destructive/10"
      } ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}

export function OneShotRouteToast({ storageKey }: { storageKey: string }) {
  const [toast, setToast] = useState<RouteToastPayload | null>(null);
  const consumedRef = useRef(false);

  useEffect(() => {
    if (consumedRef.current) {
      return;
    }

    consumedRef.current = true;

    try {
      const storedToast = window.sessionStorage.getItem(storageKey);
      if (!storedToast) {
        return;
      }

      window.sessionStorage.removeItem(storageKey);
      const parsedToast = JSON.parse(storedToast) as Partial<RouteToastPayload>;
      if (
        typeof parsedToast.text === "string" &&
        (parsedToast.type === "success" || parsedToast.type === "error")
      ) {
        setToast({ text: parsedToast.text, type: parsedToast.type });
      }
    } catch {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // Storage may be blocked; in that case there is nothing to consume.
      }
    }
  }, [storageKey]);

  if (!toast) {
    return null;
  }

  return (
    <RouteToast
      text={toast.text}
      type={toast.type}
      onDone={() => setToast(null)}
    />
  );
}
