import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricStatCardProps {
  label: string;
  value: string;
  color: string;
  href?: string;
}

export default function MetricStatCard({ label, value, color, href }: MetricStatCardProps) {
  const card = (
    <Card className={`card-hover h-full ${href ? 'cursor-pointer transition-transform hover:-translate-y-0.5' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} aria-label={`查看${label}详情`} className="block h-full">
      {card}
    </Link>
  ) : card;
}
