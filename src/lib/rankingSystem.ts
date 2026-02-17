import { AnalysisResult, AnalysisCategory } from "./mockData";

export interface ExtendedAnalysisCategory extends AnalysisCategory {
  color: "green" | "yellow" | "red";
  description: string; // 1-sentence tip
}

export interface ExtendedAnalysisResult extends Omit<AnalysisResult, "categories"> {
  categories: ExtendedAnalysisCategory[];
  tier: string;
  badge?: string;
  secondaryScore?: number; // 0.0 - 10.0
  photoSideUrl?: string;
  ger: number; // 0 - 99
  nextTier?: string;
  pointsToNextTier?: number;
  
  // New fields for deep analysis
  pslScore?: number;
  jawType?: string;
  mindset?: string;
  strategy?: string;
  breathing?: string;
  appealLevel?: string;
}

export const TIERS = [
  { name: "sub3", min: 0, max: 29, badge: "💀" },
  { name: "sub5", min: 30, max: 49, badge: "😐" },
  { name: "ltn", min: 50, max: 59, badge: "🤔" },
  { name: "mtn", min: 60, max: 69, badge: "😎" },
  { name: "htn", min: 70, max: 79, badge: "🔥" },
  { name: "chadlite", min: 80, max: 89, badge: "💪" },
  { name: "chad", min: 90, max: 94, badge: "👑" },
  { name: "true adam", min: 95, max: 99, badge: "⭐" },
];

export const ATTRIBUTES = [
  { id: "jawline", label: "Linha da Mandíbula", weight: 0.20, tip: "Mewing e redução de gordura corporal ajudam." },
  { id: "cheekbones", label: "Maçãs do Rosto", weight: 0.10, tip: "Baixo percentual de gordura destaca essa região." },
  { id: "symmetry", label: "Simetria", weight: 0.15, tip: "Durma de costas e mastigue dos dois lados." },
  { id: "skin", label: "Pele (Qualidade)", weight: 0.10, tip: "Hidratação, sono e skincare diário." },
  { id: "dark_circles", label: "Olheiras", weight: 0.05, tip: "Durma mais e use cremes com cafeína/vitamina K." },
  { id: "wrinkles", label: "Rugas", weight: 0.05, tip: "Use protetor solar e retinol." },
  { id: "nose", label: "Nariz (Harmonia)", weight: 0.10, tip: "Harmonia facial geral é o foco." },
  { id: "hairline", label: "Linha do Cabelo", weight: 0.10, tip: "Cuide do couro cabeludo e use minoxidil se necessário." },
  { id: "midface", label: "Proporção Terço Médio", weight: 0.10, tip: "Postura correta da língua pode ajudar a longo prazo." },
  { id: "eyes", label: "Olhos (Formato)", weight: 0.10, tip: "Reduza o inchaço e cuide das sobrancelhas." },
  { id: "lips", label: "Lábios", weight: 0.05, tip: "Mantenha hidratados e esfoliados." },
  { id: "posture", label: "Postura/Ângulo", weight: 0.05, tip: "Mantenha o pescoço ereto e ombros para trás." },
];

export function getTier(ger: number) {
  return TIERS.find((t) => ger >= t.min && ger <= t.max) || TIERS[0];
}

export function getNextTier(ger: number) {
  const currentTierIndex = TIERS.findIndex((t) => ger >= t.min && ger <= t.max);
  if (currentTierIndex === -1 || currentTierIndex === TIERS.length - 1) return null;
  return TIERS[currentTierIndex + 1];
}

export function calculateGER(categories: ExtendedAnalysisCategory[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  categories.forEach((cat) => {
    const attr = ATTRIBUTES.find((a) => a.id === cat.id);
    if (attr) {
      weightedSum += cat.score * attr.weight;
      totalWeight += attr.weight;
    }
  });

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

export function getColor(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  return "red";
}

export function generateExtendedMockAnalysis(): ExtendedAnalysisResult {
  const categories: ExtendedAnalysisCategory[] = ATTRIBUTES.map((attr) => {
    const score = Math.floor(Math.random() * 40) + 50; // Random score between 50 and 90
    return {
      id: attr.id,
      name: attr.label,
      score: score,
      icon: "Circle", // Placeholder
      color: getColor(score),
      description: attr.tip,
    };
  });

  const ger = calculateGER(categories);
  const tier = getTier(ger);
  const nextTier = getNextTier(ger);
  const secondaryScore = +(ger / 10).toFixed(1);

  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    overallScore: secondaryScore, // Keep compatibility
    ger: ger,
    tier: tier.name,
    badge: tier.badge,
    secondaryScore: secondaryScore,
    categories: categories,
    nextTier: nextTier ? nextTier.name : undefined,
    pointsToNextTier: nextTier ? nextTier.min - ger : 0,

    // Deep analysis mock data
    pslScore: Math.floor(Math.random() * 3) + 4, // 4-7 range
    jawType: ["Mogger", "Average", "Recessed"][Math.floor(Math.random() * 3)],
    mindset: ["Bluepilled", "Redpilled", "Blackpilled"][Math.floor(Math.random() * 3)],
    strategy: ["Genemaxx", "Looksmax", "Softmax"][Math.floor(Math.random() * 3)],
    breathing: ["Nose breather", "Mouth breather"][Math.floor(Math.random() * 2)],
    appealLevel: ["Jordan Barrett", "Chico Lachowski", "Average Joe"][Math.floor(Math.random() * 3)],
  };
}
