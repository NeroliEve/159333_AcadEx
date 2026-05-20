import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

async function LoginContent() {
  if (hasEnvVars) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      redirect("/home");
    }
  }

  return (
    <div className="w-full max-w-md">
      <LoginForm />
    </div>
  );
}

function LoginContentFallback() {
  return (
    <div className="w-full max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">Loading login...</p>
      <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoginContentFallback />}>
      <LoginContent />
    </Suspense>
  );
}
