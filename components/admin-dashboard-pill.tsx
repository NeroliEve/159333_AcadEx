"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { createClient } from "@/lib/supabase/client";

type AdminDashboardPillProps = {
  initialPendingReportCount?: number;
};

function formatCount(count: number) {
  return count > 99 ? "99+" : count.toString();
}

export function AdminDashboardPill({ initialPendingReportCount = 0 }: AdminDashboardPillProps) {
  const [count, setCount] = useState(initialPendingReportCount);

  useEffect(() => {
    setCount(initialPendingReportCount);
  }, [initialPendingReportCount]);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const channel = supabase
      .channel(`admin-pending-reports-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    async function refreshCount() {
      try {
        const response = await fetch("/api/admin/reports/pending-count", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        if (isMounted) setCount(typeof data.count === "number" ? data.count : 0);
      } catch {
        // ignore — keep last known count
      }
    }

    void refreshCount();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative">
      <PillButton asChild size="sm" variant="secondary">
        <Link href="/admin?tab=overview">
          <span className="sm:hidden">Admin</span>
          <span className="hidden sm:inline">Admin dashboard</span>
        </Link>
      </PillButton>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {formatCount(count)}
        </span>
      ) : null}
    </div>
  );
}
