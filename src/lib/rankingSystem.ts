import { AnalysisResult, AnalysisCategory, getAnalysisHistory } from "./mockData";

export interface ExtendedAnalysisCategory extends AnalysisCategory {
  color: "green" | "yellow" | "red";
  description: string;
  flaws?: string[];
  strengths?: string[];
}

export interface ExtendedAnalysisResult extends Omit<AnalysisResult, "categories"> {
  categories: ExtendedAnalysisCategory[];
  tier: string;
  badge?: string;
  secondaryScore?: number;
  photoSideUrl?: string;
  ger: number;
  nextTier?: string;
  pointsToNextTier?: number;
  song_match?: {
    track_name: string;
    artist: string;
    spotify_url: string;
    preview_url: string | null;
    mood_tags: string[];
    reason: string;
  };
  
  // Technical details
  technicalBreakdown: {
    asymmetry: string;
    thirds: string;
    jawline: string;
    cheekbones: string;
    eyes: string;
    nose: string;
    fwhr: string;
    breathing: string;
  };
  
  // New Structural Diagnosis
  structural_diagnosis?: {
    projecao_mandibular: string;
    alinhamento_cervical: string;
    definicao_terco_inferior: string;
    gordura_facial: string;
    simetria_estrutural: string;
    textura_pele: string;
    regiao_ocular: string;
    sinais_inchaco: string;
    prioridades: string[];
    severidade: Record<string, number>;
    impacto_visual: Record<string, number>;
  };

  // Legacy fields for compatibility if needed
  pslScore?: number;
  jawType?: string;
  mindset?: string;
  strategy?: string;
  breathing?: string;
  appealLevel?: string;
}

export const TIERS = [
  { name: "sub3", min: 0, max: 44, badge: "😐", label: "Sub3" },
  { name: "sub5", min: 45, max: 54, badge: "😐", label: "Sub5" },
  { name: "ltn", min: 55, max: 64, badge: "🤔", label: "LTN" },
  { name: "mtn", min: 65, max: 74, badge: "😎", label: "MTN" },
  { name: "htn", min: 75, max: 82, badge: "🔥", label: "HTN" },
  { name: "chadlite", min: 83, max: 88, badge: "💪", label: "Chadlite" },
  { name: "chad", min: 89, max: 93, badge: "👑", label: "Chad" },
  { name: "high chad", min: 94, max: 97, badge: "👑", label: "High Chad" },
  { name: "true adam", min: 98, max: 99, badge: "🌟", label: "True Adam" },
];

export const ATTRIBUTES = [
  { id: "symmetry", label: "Simetria", weight: 0.20 },
  { id: "jawline", label: "Mandíbula", weight: 0.20 },
  { id: "thirds", label: "Terços Faciais", weight: 0.15 },
  { id: "eyes", label: "Olhos", weight: 0.15 },
  { id: "cheekbones", label: "Zigomáticos", weight: 0.15 },
  { id: "nose", label: "Nariz", weight: 0.10 },
  { id: "harmony", label: "Harmonia Geral", weight: 0.10 },
  { id: "breathing", label: "Respiração", weight: 0.10 },
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

  return totalWeight > 0 ? Math.floor(weightedSum / totalWeight) : 0;
}

export function getColor(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  return "red";
}

// Box-Muller transform for normal distribution
function randomGaussian(mean: number, stdev: number): number {
  const u = 1 - Math.random(); 
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

export function generateExtendedMockAnalysis(): ExtendedAnalysisResult {
  const baseScore = Math.min(99, Math.max(30, randomGaussian(62, 10)));

  const flaws: Record<string, string[]> = {};
  const strengths: Record<string, string[]> = {};
  const technicalData: Record<string, string> = {};

  let hasHighAsymmetry = false;
  let hasWeakJaw = false;
  let hasThirdsDisproportion = false;
  let hasLowZygomatic = false;
  let hasCanthalTiltNegative = false;
  let hasDominantNose = false;

  // Helper to generate attribute score based on baseScore + variance + specific logic
  const genAttrScore = (base: number, variance: number, id: string) => {
    let score = Math.min(99, Math.max(30, base + (Math.random() * variance * 2 - variance)));
    
    // Apply specific logic per attribute
    if (id === "symmetry") {
       const asymmetry = Math.random() * 5;
       technicalData.asymmetry = `${asymmetry.toFixed(1)}%`;
       if (asymmetry > 3.0) {
         score -= 10;
         flaws['symmetry'] = [`Assimetria detectada: ${asymmetry.toFixed(1)}% (>3% limite)`];
         hasHighAsymmetry = true;
       } else if (asymmetry < 1.0) {
         score += 5;
         strengths['symmetry'] = ["Simetria facial excepcional (<1%)"];
       }
    }

    if (id === "jawline") {
       const projection = Math.random();
       if (projection < 0.3) {
         score -= 12;
         technicalData.jawline = "Recuada/Pouca projeção";
         flaws['jawline'] = ["Mandíbula pouco projetada", "Ângulo goníaco indefinido"];
         hasWeakJaw = true;
       } else if (projection > 0.85) {
         score += 8;
         technicalData.jawline = "Projetada/Forte";
         strengths['jawline'] = ["Mandíbula bem definida", "Projeção ideal"];
       } else {
         technicalData.jawline = "Média";
       }
    }

    if (id === "thirds") {
       const deviation = Math.random();
       if (deviation < 0.4) {
         score -= 10;
         technicalData.thirds = "Desproporcional";
         flaws['thirds'] = ["Terço médio compactado", "Desproporção vertical detectada"];
         hasThirdsDisproportion = true;
       } else {
         technicalData.thirds = "Equilibrada";
       }
    }

    if (id === "cheekbones") {
       const zygomatic = Math.random();
       if (zygomatic < 0.5) {
         score -= 8;
         technicalData.cheekbones = "Baixa projeção";
         flaws['cheekbones'] = ["Falta de projeção zigomática", "Estrutura óssea pouco aparente"];
         hasLowZygomatic = true;
       } else {
         technicalData.cheekbones = "Proeminente";
         strengths['cheekbones'] = ["Zigomáticos altos e definidos"];
       }
    }

    if (id === "eyes") {
       const tilt = Math.random();
       if (tilt < 0.4) {
         score -= 12;
         technicalData.eyes = "Canthal Tilt Negativo/Neutro";
         flaws['eyes'] = ["Canthal tilt negativo/neutro", "Exposição escleral superior"];
         hasCanthalTiltNegative = true;
       } else if (tilt > 0.8) {
         score += 5;
         technicalData.eyes = "Hunter Eyes";
         strengths['eyes'] = ["Área ocular compacta", "Canthal tilt positivo"];
       } else {
         technicalData.eyes = "Neutro";
       }
    }

    if (id === "nose") {
       const noseType = Math.random();
       if (noseType < 0.3) {
         score -= 10;
         technicalData.nose = "Dominante/Largo";
         flaws['nose'] = ["Nariz dominante em relação à face", "Base alar larga"];
         hasDominantNose = true;
       } else {
         technicalData.nose = "Harmônico";
       }
    }
    
    if (id === "harmony") {
        const fwhr = 1.6 + Math.random() * 0.6;
        technicalData.fwhr = fwhr.toFixed(2);
        if (fwhr < 1.7 || fwhr > 2.0) {
            score -= 10;
            flaws['harmony'] = [`FWHR ${fwhr.toFixed(2)} fora do ideal (1.8-2.0)`, "Desproporção entre largura e altura facial"];
        } else {
            strengths['harmony'] = [`FWHR ${fwhr.toFixed(2)} ideal`, "Boas proporções gerais"];
        }
    }

    if (id === "breathing") {
        const breathingType = Math.random();
        if (breathingType < 0.3) {
            score -= 15;
            technicalData.breathing = "Bucal (Mouth Breather)";
            flaws['breathing'] = ["Sinais de respiração bucal crônica", "Lábios entreabertos em repouso", "Desenvolvimento maxilar verticalizado (Face longa)"];
        } else if (breathingType > 0.7) {
            score += 10;
            technicalData.breathing = "Nasal (Nasal Breather)";
            strengths['breathing'] = ["Sinais claros de respiração nasal", "Selamento labial correto", "Desenvolvimento facial horizontal adequado"];
        } else {
            technicalData.breathing = "Mista/Neutro";
            flaws['breathing'] = ["Sinais leves de respiração mista", "Tônus labial moderado"];
        }
    }

    return Math.floor(score); // No emotional rounding up
  };

  const categories: ExtendedAnalysisCategory[] = ATTRIBUTES.map((attr) => {
    const score = genAttrScore(baseScore, 8, attr.id);
    
    // Determine description based on score
    let desc = "Estrutura dentro da média.";
    if (score < 55) desc = "Área crítica necessitando intervenção.";
    if (score > 75) desc = "Ponto forte estrutural.";
    if (flaws[attr.id]?.length) desc = flaws[attr.id][0];
    if (strengths[attr.id]?.length) desc = strengths[attr.id][0];

    return {
      id: attr.id,
      name: attr.label,
      score: score,
      icon: "Circle", 
      color: getColor(score),
      description: desc,
      flaws: flaws[attr.id] || [],
      strengths: strengths[attr.id] || []
    };
  });

  const baseGer = calculateGER(categories);

  let penalty = 0;
  if (hasHighAsymmetry) penalty += 3 + Math.floor(Math.random() * 5);
  if (hasWeakJaw) penalty += 5 + Math.floor(Math.random() * 6);
  if (hasThirdsDisproportion) penalty += 4;
  if (hasLowZygomatic) penalty += 4;
  if (hasCanthalTiltNegative) penalty += 3;
  if (hasDominantNose) penalty += 3;

  const structuralFlags = [
    hasHighAsymmetry,
    hasWeakJaw,
    hasThirdsDisproportion,
    hasLowZygomatic,
    hasCanthalTiltNegative,
    hasDominantNose,
  ];

  const structuralFailureCount = structuralFlags.filter(Boolean).length;

  let ger = Math.max(0, Math.min(99, baseGer - penalty));

  const history = getAnalysisHistory();
  const recent = history.slice(0, 10);
  const htnIndex = TIERS.findIndex((t) => t.name === "htn");
  if (recent.length >= 5 && htnIndex !== -1) {
    const highCount = recent.filter((item) => {
      const previous = item as unknown as ExtendedAnalysisResult;
      const previousGer = previous.ger ?? Math.floor(previous.overallScore * 10);
      const previousTier = getTier(previousGer);
      const idx = TIERS.findIndex((t) => t.name === previousTier.name);
      return idx >= htnIndex;
    }).length;
    if (highCount / recent.length > 0.35) {
      ger = Math.max(0, ger - 5);
    }
  }

  let tier = getTier(ger);
  let tierIndex = TIERS.findIndex((t) => t.name === tier.name);

  const indexOfTier = (name: string) => TIERS.findIndex((t) => t.name === name);

  const chadliteIndex = indexOfTier("chadlite");
  const chadIndex = indexOfTier("chad");
  const highChadIndex = indexOfTier("high chad");
  const trueAdamIndex = indexOfTier("true adam");
  const mtnIndex = indexOfTier("mtn");

  if (structuralFailureCount >= 3 && mtnIndex !== -1 && tierIndex > mtnIndex) {
    tierIndex = mtnIndex;
  }

  if (hasThirdsDisproportion && highChadIndex !== -1 && tierIndex > highChadIndex) {
    tierIndex = highChadIndex;
  }

  if (hasHighAsymmetry && chadIndex !== -1 && tierIndex > chadIndex) {
    tierIndex = chadIndex;
  }

  if (hasWeakJaw && chadliteIndex !== -1 && tierIndex > chadliteIndex) {
    tierIndex = chadliteIndex;
  }

  if (trueAdamIndex !== -1 && tierIndex === trueAdamIndex) {
    const symmetryCategory = categories.find((c) => c.id === "symmetry");
    const harmonyCategory = categories.find((c) => c.id === "harmony");
    const symmetryOk = symmetryCategory ? symmetryCategory.score >= 90 : false;
    const harmonyOk = harmonyCategory ? harmonyCategory.score >= 90 : false;
    if (!symmetryOk || !harmonyOk || structuralFailureCount > 0) {
      if (highChadIndex !== -1) {
        tierIndex = highChadIndex;
      } else if (chadIndex !== -1) {
        tierIndex = chadIndex;
      }
    }
  }

  tier = TIERS[Math.max(0, Math.min(TIERS.length - 1, tierIndex))];
  const nextTier = getNextTier(ger);
  const secondaryScore = +(ger / 10).toFixed(1);
  const pslScore = secondaryScore;

  const mindset =
    ger < 55 ? "Em desenvolvimento" : ger < 75 ? "Equilibrada" : "Dominante";

  const strategy = ger < 60 ? "Maximização intensa" : "Otimização refinada";

  const jawType = technicalData.jawline || "Não avaliado";

  const breathing = technicalData.breathing || "Mista/Neutro";

  const appealLevel = tier.label || tier.name.toUpperCase();

  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    overallScore: secondaryScore,
    ger: ger,
    tier: tier.name,
    badge: tier.badge,
    secondaryScore: secondaryScore,
    categories: categories,
    nextTier: nextTier ? nextTier.name : undefined,
    pointsToNextTier: nextTier ? nextTier.min - ger : 0,
    
    technicalBreakdown: {
        asymmetry: technicalData.asymmetry || "N/A",
        thirds: technicalData.thirds || "N/A",
        jawline: technicalData.jawline || "N/A",
        cheekbones: technicalData.cheekbones || "N/A",
        eyes: technicalData.eyes || "N/A",
        nose: technicalData.nose || "N/A",
        fwhr: technicalData.fwhr || "N/A",
        breathing: technicalData.breathing || "N/A"
    },

    // Campos agregados usados na tela de resultados
    pslScore,
    jawType,
    mindset,
    strategy,
    breathing,
    appealLevel,
  };
}
