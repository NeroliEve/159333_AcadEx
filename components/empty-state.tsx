import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  eyebrow?: string;
  title: string;
};

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  eyebrow,
  title,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="space-y-3">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
        {actionHref && actionLabel ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
