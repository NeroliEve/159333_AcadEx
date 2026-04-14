import { createClient } from "@/lib/supabase/server";

type AdminContext = {
  isAdmin: boolean;
  profileId: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string | null;
};

export async function getAdminContext(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAdmin: false,
      profileId: null,
      supabase,
      userId: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    isAdmin: profile?.role === "admin",
    profileId: profile?.id ?? null,
    supabase,
    userId: user.id,
  };
}
