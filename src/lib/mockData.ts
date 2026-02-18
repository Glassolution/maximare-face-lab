export interface AnalysisCategory {
  id: string;
  name: string;
  score: number;
  icon: string;
}

export interface AnalysisResult {
  id: string;
  date: string;
  overallScore: number;
  categories: AnalysisCategory[];
  photoUrl?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: "skincare" | "cabelo" | "fitness" | "postura" | "estilo";
  impact: "alto" | "medio" | "baixo";
  details: string;
  steps: string[];
  suggestions?: string[];
}

export function generateMockAnalysis(): AnalysisResult {
  const categories: AnalysisCategory[] = [
    { id: "simetria", name: "Simetria Facial", score: +(6 + Math.random() * 3).toFixed(1), icon: "Scan" },
    { id: "estrutura", name: "Estrutura Óssea", score: +(5.5 + Math.random() * 3.5).toFixed(1), icon: "Diamond" },
    { id: "harmonia", name: "Harmonia Facial", score: +(6 + Math.random() * 3).toFixed(1), icon: "Sparkles" },
    { id: "pele", name: "Qualidade da Pele", score: +(5 + Math.random() * 4).toFixed(1), icon: "Droplets" },
    { id: "cabelo", name: "Cabelo & Styling", score: +(5 + Math.random() * 4).toFixed(1), icon: "Scissors" },
    { id: "olhos", name: "Área dos Olhos", score: +(6 + Math.random() * 3).toFixed(1), icon: "Eye" },
  ];
  const overall = +(categories.reduce((s, c) => s + c.score, 0) / categories.length).toFixed(1);
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    overallScore: overall,
    categories,
  };
}

export const mockRecommendations: Recommendation[] = [
  {
    id: "1", title: "Rotina de Skincare Básica", description: "Limpeza, hidratação e proteção solar diárias para melhorar a qualidade da pele.",
    category: "skincare", impact: "alto",
    details: "Uma rotina consistente de skincare é o pilar fundamental para melhorar a aparência da pele. Resultados visíveis em 4-6 semanas.",
    steps: ["Lave o rosto 2x ao dia com sabonete facial suave", "Aplique hidratante após lavar", "Use protetor solar FPS 50 todos os dias", "Aplique retinol à noite (2-3x por semana)"],
    suggestions: ["CeraVe Foaming Cleanser", "La Roche-Posay Anthelios"],
  },
  {
    id: "2", title: "Corte de Cabelo Estratégico", description: "Escolha um corte que valorize seu formato de rosto e estrutura óssea.",
    category: "cabelo", impact: "alto",
    details: "O corte certo pode transformar completamente sua aparência, criando a ilusão de uma mandíbula mais definida e proporções mais harmônicas.",
    steps: ["Identifique seu formato de rosto", "Consulte um barbeiro experiente", "Peça um fade nas laterais para alongar o rosto", "Mantenha o topo com volume moderado"],
  },
  {
    id: "3", title: "Exercícios de Mewing", description: "Postura correta da língua para definir a mandíbula e melhorar a harmonia facial.",
    category: "postura", impact: "medio",
    details: "Mewing é a prática de manter a língua pressionada contra o céu da boca. Com consistência, pode melhorar a definição da mandíbula.",
    steps: ["Pressione toda a língua no céu da boca", "Mantenha os lábios fechados e dentes levemente encostados", "Respire pelo nariz", "Pratique constantemente até virar hábito"],
  },
  {
    id: "4", title: "Treino de Pescoço e Trapézio", description: "Fortaleça a musculatura do pescoço para uma aparência mais masculina.",
    category: "fitness", impact: "medio",
    details: "Um pescoço mais grosso e trapézios desenvolvidos criam uma silhueta mais imponente e complementam a estrutura facial.",
    steps: ["Faça neck curls 3x por semana", "Inclua shrugs no treino", "Comece com cargas leves", "Aumente gradualmente a intensidade"],
  },
  {
    id: "5", title: "Guarda-Roupa Minimalista", description: "Monte um guarda-roupa cápsula com peças que valorizam seu biotipo.",
    category: "estilo", impact: "medio",
    details: "Roupas bem ajustadas e em cores neutras elevam a aparência geral de forma simples e eficaz.",
    steps: ["Invista em camisetas bem cortadas", "Tenha 2-3 calças de bom caimento", "Use tênis limpos e minimalistas", "Escolha cores neutras: preto, branco, cinza, azul marinho"],
  },
  {
    id: "6", title: "Tratamento para Olheiras", description: "Reduza olheiras e inchaço para uma aparência mais descansada e jovial.",
    category: "skincare", impact: "baixo",
    details: "Olheiras podem envelhecer o rosto significativamente. Tratamentos tópicos e mudanças de hábito podem reduzir drasticamente.",
    steps: ["Durma 7-8 horas por noite", "Use creme para olheiras com vitamina K", "Aplique compressas frias pela manhã", "Beba mais água ao longo do dia"],
  },
  {
    id: "7", title: "Postura Corporal Correta", description: "Corrija a postura para transmitir mais confiança e parecer mais alto.",
    category: "postura", impact: "alto",
    details: "Uma boa postura não só melhora a aparência como também transmite confiança e autoridade.",
    steps: ["Mantenha ombros para trás e para baixo", "Alinhe orelhas com ombros", "Fortaleça o core com prancha", "Faça alongamentos diários de peito e quadril"],
  },
  {
    id: "8", title: "Redução de Gordura Facial", description: "Defina melhor a mandíbula e maçãs do rosto reduzindo gordura facial.",
    category: "fitness", impact: "alto",
    details: "Reduzir o percentual de gordura corporal revela a estrutura óssea facial, definindo mandíbula e maçãs do rosto.",
    steps: ["Mantenha déficit calórico moderado", "Reduza consumo de sódio e álcool", "Faça exercícios cardio 3-4x por semana", "Beba pelo menos 2.5L de água por dia"],
  },
];

export function getAnalysisHistory(): AnalysisResult[] {
  const stored = localStorage.getItem("maximare_history");
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as AnalysisResult[];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveAnalysis(analysis: AnalysisResult) {
  const history = getAnalysisHistory() as (AnalysisResult & {
    ger?: number;
    tier?: string;
    badge?: string;
    photoUrl?: string | null;
  })[];

  const extended = analysis as AnalysisResult & {
    ger?: number;
    tier?: string;
    badge?: string;
    photoUrl?: string | null;
  };

  const entry: AnalysisResult & {
    ger?: number;
    tier?: string;
    badge?: string;
    photoUrl?: string | null;
  } = {
    id: analysis.id,
    date: analysis.date,
    overallScore: analysis.overallScore,
    categories: analysis.categories,
    ger: extended.ger,
    tier: extended.tier,
    badge: extended.badge,
    photoUrl: extended.photoUrl ?? null,
  };

  const newHistory = [entry, ...history].slice(0, 20);

  try {
    localStorage.setItem("maximare_history", JSON.stringify(newHistory));
  } catch {
    try {
      const trimmed = newHistory.slice(0, 10).map((item) => ({
        id: item.id,
        date: item.date,
        overallScore: item.overallScore,
        categories: item.categories,
        ger: item.ger,
        tier: item.tier,
        badge: item.badge,
        photoUrl: item.photoUrl ?? null,
      }));
      localStorage.setItem("maximare_history", JSON.stringify(trimmed));
    } catch {
      localStorage.removeItem("maximare_history");
    }
  }
}
