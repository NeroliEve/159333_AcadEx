"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { PillButton } from "@/components/ui/pill-button";

type AiSearchResponse = {
  status: "success" | "error";
  explanation?: string;
  filters?: Record<string, string>;
  message?: string;
};

export function AiSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = (await response.json()) as AiSearchResponse;

      if (data.status === "error") {
        setError(data.message ?? "AI search failed. Please try again.");
        return;
      }

      // Build URL params from the filters Claude extracted
      const params = new URLSearchParams(data.filters ?? {});

      // Pass the explanation through the URL so the browse page can display it
      if (data.explanation) {
        params.set("_ai", data.explanation);
      }

      router.push(`/browse?${params.toString()}`);
    } catch {
      setError("AI search is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-medium">AI Search</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Claude
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "cheap first year programming book for Massey"'
          disabled={loading}
          className="min-w-0 flex-1"
        />
        <PillButton
          type="submit"
          disabled={loading || !query.trim()}
          className="w-full sm:w-auto"
        >
          {loading ? "Searching..." : "Ask AI"}
        </PillButton>
      </form>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
