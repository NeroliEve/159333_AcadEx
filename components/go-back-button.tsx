"use client";

import { useRouter } from "next/navigation";

import { PillButton } from "@/components/ui/pill-button";

export function GoBackButton() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/home");
  }

  return (
    <PillButton size="sm" variant="secondary" onClick={goBack}>
      Go back
    </PillButton>
  );
}
