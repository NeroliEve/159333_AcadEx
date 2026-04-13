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

  return <PillButton onClick={logout}>Log out</PillButton>;
}


