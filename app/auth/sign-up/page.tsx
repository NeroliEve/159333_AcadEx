import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/sign-up-form";
import { getDegreeOptions, getUniversityOptions } from "@/lib/marketplace";
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

  const [degrees, universities] = await Promise.all([
    getDegreeOptions(),
    getUniversityOptions(),
  ]);

  return (
    <div className="w-full max-w-lg">
      <SignUpForm degrees={degrees} universities={universities} />
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
