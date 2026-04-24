"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { ConversationSummary } from "@/lib/messages";

type MessagesContextValue = {
  setSummaries: React.Dispatch<React.SetStateAction<ConversationSummary[]>>;
  summaries: ConversationSummary[];
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

type MessagesProviderProps = {
  children: React.ReactNode;
  initialSummaries: ConversationSummary[];
};

export function MessagesProvider({
  children,
  initialSummaries,
}: MessagesProviderProps) {
  const [summaries, setSummaries] = useState(initialSummaries);

  const value = useMemo(
    () => ({
      setSummaries,
      summaries,
    }),
    [summaries],
  );

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessagesContext() {
  const context = useContext(MessagesContext);

  if (!context) {
    throw new Error("useMessagesContext must be used within a MessagesProvider.");
  }

  return context;
}
