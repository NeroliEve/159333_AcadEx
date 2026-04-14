"use client";

import { createClient } from "@/lib/supabase/client";
import { PillButton } from "@/components/ui/pill-button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
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


