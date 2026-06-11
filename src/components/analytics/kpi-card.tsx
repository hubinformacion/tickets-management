import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon: React.ReactNode;
  description?: string;
  className?: string;
  iconClassName?: string;
}

export function KpiCard({ title, value, trend, trendLabel, icon, description, className, iconClassName }: KpiCardProps) {
  const trendDirection = trend != null ? (trend > 0 ? "up" : trend < 0 ? "down" : "neutral") : null;

  return (
    <Card className={cn("relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/80 group", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {trendDirection && (
              <div className="flex items-center gap-1 text-xs mt-1">
                {trendDirection === "up" && (
                  <>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">+{trend}%</span>
                  </>
                )}
                {trendDirection === "down" && (
                  <>
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    <span className="font-medium text-red-600 dark:text-red-400">{trend}%</span>
                  </>
                )}
                {trendDirection === "neutral" && (
                  <>
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">0%</span>
                  </>
                )}
                {trendLabel && <span className="text-muted-foreground ml-0.5">{trendLabel}</span>}
              </div>
            )}
            {description && !trendDirection && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn(
            "rounded-xl p-2.5 text-muted-foreground bg-muted/40 group-hover:bg-muted/70 transition-colors shrink-0",
            iconClassName
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
