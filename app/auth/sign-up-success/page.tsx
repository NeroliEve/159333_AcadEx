import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            Confirm your account to continue into Acadex.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to your email address. Once confirmed,
            you can sign in and continue to the app.
          </p>
          <Link
            href="/auth/login"
            className="text-sm font-medium underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
