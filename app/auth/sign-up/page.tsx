import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/sign-up-form";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Page() {
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
