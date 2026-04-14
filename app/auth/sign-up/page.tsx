import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/sign-up-form";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

async function SignUpContent() {
  if (hasEnvVars) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      redirect("/home");
    }
  }

  return (
    <div className="w-full max-w-md">
      <SignUpForm />
    </div>
  );
}

function SignUpContentFallback() {
  return <div className="h-96 w-full max-w-md animate-pulse rounded-2xl border border-border/70 bg-muted/40" />;
}

export default function Page() {
  return (
    <Suspense fallback={<SignUpContentFallback />}>
      <SignUpContent />
    </Suspense>
  );
}
