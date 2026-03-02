import { useEffect, useMemo, useState } from "react";
import type { BattleResult } from "@/types/battle";

export function useBattleTimeout(battle: any | null, result: BattleResult | null, serverTimeOffsetMs: number) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const nowServerApprox = useMemo(() => now + serverTimeOffsetMs, [now, serverTimeOffsetMs]);

  const processingDeadlineMs = useMemo(() => {
    if (!battle) return null;
    if (battle.status === "canceled" || battle.status === "expired" || battle.status === "finished") return null;
    if ((battle.status === "ready" || battle.status === "running") && !result) {
      const base = battle.start_at ? new Date(battle.start_at).getTime() : nowServerApprox;
      return base + 60000;
    }
    return null;
  }, [battle, result, nowServerApprox]);

  const hardTimedOut =
    !!processingDeadlineMs && nowServerApprox >= processingDeadlineMs && battle?.status !== "finished" && !result;

  return { nowServerApprox, processingDeadlineMs, hardTimedOut };
}
