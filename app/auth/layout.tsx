import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Acadex
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
