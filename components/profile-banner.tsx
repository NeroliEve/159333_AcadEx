import { Card, CardContent } from "@/components/ui/card";

type ProfileBannerProps = {
  email?: string | null;
  name: string;
  university?: string | null;
};

export function ProfileBanner({
  email,
  name,
  university,
}: ProfileBannerProps) {
  return (
    <Card className="border-border/70 bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--secondary)))]">
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Your Acadex profile
          </p>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {university || "University not added yet"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:text-right">
          <div>
            <p className="text-muted-foreground">Account email</p>
            <p className="font-medium text-foreground">
              {email || "Email unavailable"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
