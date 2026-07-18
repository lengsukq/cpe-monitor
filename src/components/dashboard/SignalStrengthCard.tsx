import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const badgeVariant = (
    signalQuality?.variant === 'success'
      || signalQuality?.variant === 'info'
      || signalQuality?.variant === 'warning'
      || signalQuality?.variant === 'danger'
      || signalQuality?.variant === 'default'
      || signalQuality?.variant === 'secondary'
      || signalQuality?.variant === 'destructive'
      || signalQuality?.variant === 'outline'
  ) ? signalQuality.variant as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'info' | 'warning' | 'danger'
    : 'secondary';

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
