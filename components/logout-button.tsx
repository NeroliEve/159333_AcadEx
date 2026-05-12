"use client";

import { createClient } from "@/lib/supabase/client";
import { PillButton } from "@/components/ui/pill-button";

export function LogoutButton() {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full reload clears Next.js router cache so cached RSC from the
    // previous user can't leak into the next session.
    window.location.href = "/";
  };

  return (
    <PillButton
      size="sm"
      onClick={logout}
      style={{ paddingLeft: "1rem", paddingRight: "1rem" }}
    >
      Log out
    </PillButton>
  );
}
