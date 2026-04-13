import Link from "next/link";
import { BrandTitle } from "@/components/brand-title";
import { ThemePicker } from "@/components/theme-picker";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <BrandTitle priority />
          </Link>
          <div className="flex items-center gap-3">
            <ThemePicker />
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to site
            </Link>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
