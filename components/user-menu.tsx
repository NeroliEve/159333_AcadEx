"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type UserMenuProps = {
  avatarUrl?: string | null;
  email?: string | null;
  name?: string | null;
};

function getInitial(name?: string | null, email?: string | null) {
  return (name?.trim().charAt(0) || email?.trim().charAt(0) || "A").toUpperCase();
}

export function UserMenu({ avatarUrl, email, name }: UserMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={isOpen}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary text-sm font-semibold text-secondary-foreground transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setIsOpen((current) => !current)}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="h-full w-full object-cover"
            src={avatarUrl}
          />
        ) : (
          <span>{getInitial(name, email)}</span>
        )}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-border/70 bg-background p-2 shadow-lg">
          <div className="border-b border-border/70 px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {name || "Your account"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {email || "Email unavailable"}
            </p>
          </div>

          <div className="grid gap-1 pt-2">
            <Link
              href="/profile"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              Edit profile
            </Link>
            <button
              type="button"
              className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
