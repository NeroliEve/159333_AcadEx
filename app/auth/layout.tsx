import Link from "next/link";
import Image from "next/image";
import { ThemePicker } from "@/components/theme-picker";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="w-full border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/acadex-icon.svg"
              alt="Acadex"
              width={48}
              height={48}
              priority
              className="h-10 w-10"
            />
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
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
