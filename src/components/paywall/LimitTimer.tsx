import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { differenceInSeconds } from "date-fns";

interface LimitTimerProps {
  nextAvailableAt: Date | null;
}

export function LimitTimer({ nextAvailableAt }: LimitTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!nextAvailableAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = differenceInSeconds(nextAvailableAt, now);

      if (diff <= 0) {
        setTimeLeft("Disponível agora!");
        return;
      }

      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;

      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextAvailableAt]);

  if (!nextAvailableAt) return null;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-border/50 animate-in fade-in">
      <div className="flex items-center gap-2 text-amber-500 mb-1">
        <Clock className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Próxima análise em</span>
      </div>
      <p className="text-2xl font-mono font-bold text-foreground tabular-nums">{timeLeft}</p>
    </div>
  );
}
