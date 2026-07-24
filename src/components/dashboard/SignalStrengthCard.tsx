import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BADGE_VARIANTS = ['default', 'secondary', 'destructive', 'outline', 'success', 'info', 'warning', 'danger'] as const;
type BadgeVariant = (typeof BADGE_VARIANTS)[number];

function toBadgeVariant(variant: string | undefined): BadgeVariant {
  return BADGE_VARIANTS.includes(variant as BadgeVariant) ? (variant as BadgeVariant) : 'secondary';
}

interface SignalStrengthCardProps {
  signalStrength?: number;
  signalQuality?: {
    label: string;
    variant: string;
  } | null;
}

export default function SignalStrengthCard({
  signalStrength,
  signalQuality,
}: SignalStrengthCardProps) {
  const badgeVariant = toBadgeVariant(signalQuality?.variant);

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">信号强度</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {signalStrength || 0} dBm
          {signalQuality ? (
            <Badge variant={badgeVariant} className="ml-2 text-xs">
              {signalQuality.label}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
