export interface GerAttribute {
  id: string;
  name: string;
  score: number;
  icon: string;
}

export interface GerResult {
  isValidFace: boolean;
  isPartial: boolean;
  ger: number;
  secondaryScore: number;
  tier: string;
  nextTier: { name: string; pointsNeeded: number } | null;
  attributes: GerAttribute[];
  strengths: string[];
  weaknesses: string[];
  report: {
    summary: string;
    strongPoints: string[];
    weakPoints: string[];
  };
  frontalPhoto?: string;
  lateralPhoto?: string;
  date?: string;
  id?: string;
}

export const TIER_LABELS: Record<string, { label: string; emoji: string }> = {
  "sub3": { label: "SUB3", emoji: "💀" },
  "sub5": { label: "SUB5", emoji: "😐" },
  "ltn": { label: "LTN", emoji: "😏" },
  "mtn": { label: "MTN", emoji: "😎" },
  "htn": { label: "HTN", emoji: "🔥" },
  "chadlite": { label: "CHADLITE", emoji: "💪" },
  "chad": { label: "CHAD", emoji: "👑" },
  "true adam": { label: "TRUE ADAM", emoji: "⭐" },
};

export function getScoreColor(score: number): string {
  if (score >= 80) return "hsl(142, 76%, 46%)";  // green
  if (score >= 65) return "hsl(142, 76%, 46%)";  // green
  if (score >= 50) return "hsl(38, 92%, 55%)";   // yellow/orange
  return "hsl(0, 84%, 60%)";                     // red
}

export function getScoreColorClass(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 65) return "bg-warning";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

export function saveGerResult(result: GerResult) {
  const history = getGerHistory();
  const entry = { ...result, id: crypto.randomUUID(), date: new Date().toISOString() };
  history.unshift(entry);
  localStorage.setItem("maximare_ger_history", JSON.stringify(history));
  return entry;
}

export function getGerHistory(): GerResult[] {
  const stored = localStorage.getItem("maximare_ger_history");
  return stored ? JSON.parse(stored) : [];
}
