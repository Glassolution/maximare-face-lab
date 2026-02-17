import { GerResult, getGerHistory } from "./gerTypes";
import type { ExtendedAnalysisResult } from "./rankingSystem";
import { getAnalysisHistory, type AnalysisResult } from "./mockData";

export interface FacialBottleneck {
  id: string;
  area: string;
  score: number;
  maxScore: number;
  priority: "critica" | "alta" | "media";
  icon: string;
}

export interface SmartTrend {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  area: string;
  areaScore: number;
  impactEstimate: number; // 1-10
  duration: string;
  frequency: string;
  validation: "cientifica" | "viral" | "experimental";
  science: string;
  steps: { text: string; detail?: string }[];
  disclaimer: string;
  tags: string[];
}

export interface PersonalizedPlan {
  bottlenecks: FacialBottleneck[];
  trends: SmartTrend[];
  gerScore: number;
  hasAnalysis: boolean;
}

// ─── Trend Database ───
const TREND_DATABASE: Record<string, SmartTrend[]> = {
  eyes: [
    {
      id: "ice-face-eyes", title: "Ice Face Periorbital", subtitle: "Drenagem criogênica para redução de olheiras",
      reason: "Sua área dos olhos está abaixo do ideal. A crioterapia facial pode potencialmente reduzir retenção hídrica e melhorar a microcirculação periorbital.",
      area: "eyes", areaScore: 0, impactEstimate: 7, duration: "14 dias", frequency: "2x ao dia (manhã e noite)",
      validation: "cientifica",
      science: "A exposição ao frio contrai vasos sanguíneos superficiais (vasoconstricção), reduzindo edema e escurecimento. Estudos dermatológicos indicam melhora na aparência de olheiras vasculares com crioterapia regular.",
      steps: [
        { text: "Prepare água gelada com cubos de gelo em uma tigela", detail: "Temperatura ideal: 2-5°C" },
        { text: "Mergulhe o rosto por 15-20 segundos", detail: "Foque na região periorbital" },
        { text: "Repita 3 ciclos com 10s de descanso", detail: "Total: ~2 minutos" },
        { text: "Seque suavemente e aplique creme para olheiras", detail: "Com cafeína ou vitamina K para potencializar" },
      ],
      disclaimer: "Não substitui avaliação dermatológica. Olheiras podem ter causas genéticas que requerem tratamento profissional.",
      tags: ["Crioterapia", "Olheiras", "Anti-edema"],
    },
    {
      id: "sleep-protocol", title: "Protocolo de Sono Estratégico", subtitle: "Otimize o ciclo circadiano para regeneração facial",
      reason: "O sono inadequado é uma das principais causas de deterioração da área periorbital.",
      area: "eyes", areaScore: 0, impactEstimate: 8, duration: "21 dias", frequency: "Diário",
      validation: "cientifica",
      science: "Durante o sono profundo (estágio N3), o corpo libera GH (hormônio do crescimento) que estimula a regeneração celular. Estudos mostram correlação direta entre qualidade do sono e aparência da pele periorbital.",
      steps: [
        { text: "Durma 7-8 horas por noite, sempre no mesmo horário", detail: "Consistência é mais importante que duração" },
        { text: "Eleve levemente a cabeça com travesseiro extra", detail: "Previne acúmulo de líquido na região dos olhos" },
        { text: "Evite telas 1h antes de dormir", detail: "Luz azul suprime melatonina" },
        { text: "Hidrate-se bem durante o dia, reduza líquidos 2h antes de dormir" },
      ],
      disclaimer: "Distúrbios crônicos do sono devem ser avaliados por profissional de saúde.",
      tags: ["Sono", "Regeneração", "Circadiano"],
    },
  ],
  skin: [
    {
      id: "skincare-evidence", title: "Skincare Baseado em Evidência", subtitle: "Rotina minimalista com ingredientes ativos comprovados",
      reason: "Seu score de pele indica espaço para melhora significativa com uma rotina estruturada.",
      area: "skin", areaScore: 0, impactEstimate: 9, duration: "30 dias", frequency: "2x ao dia",
      validation: "cientifica",
      science: "Retinóides, niacinamida e protetor solar são os três pilares com maior evidência científica para melhora de textura, tom e prevenção de envelhecimento cutâneo.",
      steps: [
        { text: "Manhã: Lave com sabonete facial suave (pH 5.5)", detail: "Evite sabonetes alcalinos que danificam a barreira" },
        { text: "Aplique sérum de Niacinamida 5%", detail: "Reduz poros e melhora uniformidade" },
        { text: "Protetor solar FPS 50+ (reaplicar a cada 3h)", detail: "O passo mais impactante contra envelhecimento" },
        { text: "Noite: Retinol 0.3% (2-3x/semana)", detail: "Comece devagar para evitar irritação" },
      ],
      disclaimer: "Consulte um dermatologista antes de iniciar retinóides. Pode causar sensibilidade solar.",
      tags: ["Retinol", "Niacinamida", "SPF"],
    },
    {
      id: "anti-inflammation", title: "Protocolo Anti-Inflamação", subtitle: "Reduza inflamação sistêmica para pele mais limpa",
      reason: "Inflamação subclínica é uma das causas menos visíveis de degradação da qualidade da pele.",
      area: "skin", areaScore: 0, impactEstimate: 7, duration: "21 dias", frequency: "Diário",
      validation: "cientifica",
      science: "Dietas ricas em açúcar refinado e laticínios estão associadas a aumento de IGF-1 e inflamação, que pode manifestar-se como acne, vermelhidão e textura irregular.",
      steps: [
        { text: "Reduza açúcar refinado e processados", detail: "Glicemia alta aumenta glicação e envelhece a pele" },
        { text: "Aumente Ômega-3 (peixes, linhaça)", detail: "Anti-inflamatório natural" },
        { text: "Beba 2.5L de água por dia", detail: "Hidratação interna reflete externamente" },
        { text: "Considere reduzir laticínios por 30 dias", detail: "Teste se há correlação com sua pele" },
      ],
      disclaimer: "Mudanças dietéticas não substituem tratamento dermatológico para condições como acne cística.",
      tags: ["Dieta", "Anti-inflamatório", "Nutrição"],
    },
  ],
  jawline: [
    {
      id: "jaw-training", title: "Jaw Training Progressivo", subtitle: "Hipertrofia do masseter para definição mandibular",
      reason: "Seu score de mandíbula pode ser potencialmente melhorado com treino muscular direcionado.",
      area: "jawline", areaScore: 0, impactEstimate: 7, duration: "60 dias", frequency: "5x/semana",
      validation: "viral",
      science: "O músculo masseter responde a estímulo de resistência como outros músculos esqueléticos. Exercícios de mastigação resistida podem potencialmente aumentar o volume do masseter, criando a aparência de mandíbula mais larga.",
      steps: [
        { text: "Use goma de mascar dura (tipo falim) por 10 min", detail: "Não exceda para evitar disfunção TMJ" },
        { text: "Faça exercícios de resistência mandibular", detail: "Abra e feche com resistência leve" },
        { text: "Massageie o masseter após treino", detail: "Previne tensão excessiva" },
        { text: "Descanse 2 dias por semana", detail: "Recuperação muscular é essencial" },
      ],
      disclaimer: "Exercícios mandibulares excessivos podem causar disfunção temporomandibular (TMJ). Consulte um dentista se sentir dor.",
      tags: ["Masseter", "Definição", "Mandíbula"],
    },
    {
      id: "body-fat-jaw", title: "Redução de Gordura Facial", subtitle: "Revele a estrutura óssea existente",
      reason: "Reduzir o percentual de gordura corporal pode revelar melhor a definição mandibular natural.",
      area: "jawline", areaScore: 0, impactEstimate: 8, duration: "45 dias", frequency: "Diário",
      validation: "cientifica",
      science: "A gordura subcutânea facial, especialmente na região submandibular e bucal, mascara a estrutura óssea. Déficit calórico moderado (300-500 kcal) resulta em perda de gordura gradual incluindo a facial.",
      steps: [
        { text: "Mantenha déficit calórico de 300-500 kcal", detail: "Use uma calculadora TDEE como referência" },
        { text: "Reduza sódio para evitar retenção hídrica facial", detail: "Menos de 2g/dia" },
        { text: "Cardio 3-4x por semana (30-45 min)", detail: "HIIT ou caminhada inclinada" },
        { text: "Evite álcool (causa inchaço facial)", detail: "Efeito visível em 7-14 dias" },
      ],
      disclaimer: "Não busque percentuais de gordura extremamente baixos. Isso pode ser prejudicial à saúde.",
      tags: ["Déficit", "Leanness", "Definição"],
    },
  ],
  symmetry: [
    {
      id: "mewing-protocol", title: "Mewing (Postura Lingual)", subtitle: "Postura orttrópica para harmonia facial",
      reason: "Seu score de simetria pode se beneficiar de correção postural craniofacial.",
      area: "symmetry", areaScore: 0, impactEstimate: 6, duration: "90 dias", frequency: "Constante",
      validation: "experimental",
      science: "A teoria ortotrópica sugere que a postura lingual correta (língua pressionada no palato) pode influenciar o desenvolvimento craniofacial. Evidência científica é limitada mas em crescimento.",
      steps: [
        { text: "Pressione toda a língua (inclusive posterior) no céu da boca", detail: "O terço posterior é o mais importante" },
        { text: "Mantenha lábios fechados e dentes levemente encostados", detail: "Sem apertar — contato leve" },
        { text: "Respire exclusivamente pelo nariz", detail: "Respiração bucal contribui para face alongada" },
        { text: "Mantenha durante o dia todo até virar hábito", detail: "Leva 2-3 semanas para automatizar" },
      ],
      disclaimer: "Resultados significativos em adultos não são cientificamente garantidos. Não altera estrutura óssea consolidada.",
      tags: ["Ortotrópico", "Postura", "Harmonia"],
    },
    {
      id: "facial-massage", title: "Massagem Facial Simétrica", subtitle: "Drenagem linfática para equilíbrio facial",
      reason: "Retenção hídrica assimétrica pode contribuir para a aparência de assimetria.",
      area: "symmetry", areaScore: 0, impactEstimate: 5, duration: "21 dias", frequency: "Diário (5 min)",
      validation: "cientifica",
      science: "A drenagem linfática facial auxilia na remoção de fluidos acumulados de forma assimétrica, potencialmente melhorando a aparência de simetria a curto prazo.",
      steps: [
        { text: "Aplique óleo facial ou sérum como lubrificante" },
        { text: "Massageie do centro para as laterais com movimentos suaves", detail: "Siga as linhas de drenagem linfática" },
        { text: "Dê atenção especial ao lado com mais volume", detail: "Mais repetições no lado mais inchado" },
        { text: "Finalize com movimentos descendentes no pescoço", detail: "Direciona fluidos para linfonodos cervicais" },
      ],
      disclaimer: "Efeitos são temporários e baseados em redução de edema, não alteração estrutural.",
      tags: ["Drenagem", "Linfática", "Simetria"],
    },
  ],
  harmony: [
    {
      id: "posture-correction", title: "Correção Postural Cervical", subtitle: "Alinhe pescoço e cabeça para melhor projeção facial",
      reason: "A postura cervical afeta diretamente como seu rosto é percebido em harmonia.",
      area: "harmony", areaScore: 0, impactEstimate: 7, duration: "30 dias", frequency: "3x ao dia (5 min)",
      validation: "cientifica",
      science: "A postura anterior da cabeça (forward head posture) cria a aparência de queixo recuado e pescoço curto. Correção postural pode melhorar significativamente o perfil facial percebido.",
      steps: [
        { text: "Chin tucks: Puxe o queixo para trás criando 'papada'", detail: "10 reps, segure 5s cada" },
        { text: "Alongamento de esternocleidomastóideo", detail: "30s cada lado, 2x" },
        { text: "Fortalecimento de extensores cervicais", detail: "Deite de bruços, levante a cabeça" },
        { text: "Monitor na altura dos olhos, telefone elevado", detail: "Ergonomia previne recidiva" },
      ],
      disclaimer: "Dor cervical persistente requer avaliação médica. Não force movimentos dolorosos.",
      tags: ["Postura", "Cervical", "Perfil"],
    },
  ],
  hairline: [
    {
      id: "hairline-care", title: "Protocolo de Manutenção Capilar", subtitle: "Preserve e otimize sua hairline",
      reason: "Seu score de hairline pode se beneficiar de cuidados preventivos capilares.",
      area: "hairline", areaScore: 0, impactEstimate: 7, duration: "90 dias", frequency: "Diário",
      validation: "cientifica",
      science: "Minoxidil tópico é um dos poucos tratamentos aprovados pela FDA para alopecia androgenética. Associado a micro-needling, pode potencializar a absorção e estimular fatores de crescimento.",
      steps: [
        { text: "Consulte um dermatologista tricologista", detail: "Essencial antes de qualquer tratamento" },
        { text: "Considere Minoxidil 5% tópico (se prescrito)", detail: "Aplicar 2x ao dia nas áreas afetadas" },
        { text: "Microagulhamento com dermaroller 0.5mm 1x/semana", detail: "Estimula fatores de crescimento locais" },
        { text: "Corte estratégico para valorizar sua hairline atual", detail: "Peça ao barbeiro um fade que valorize" },
      ],
      disclaimer: "Tratamentos capilares devem ser orientados por dermatologista. Resultados variam individualmente.",
      tags: ["Capilar", "Hairline", "Tricologia"],
    },
  ],
};

// ─── Score Mapping ───
type TrendSource = GerResult | ExtendedAnalysisResult | AnalysisResult;

function mapAttributesToAreas(result: TrendSource): Record<string, number> {
  const areas: Record<string, number> = {};
  
  if ("attributes" in result) {
    const attrs = (result as GerResult).attributes;
    for (const attr of attrs) {
      const name = (attr.name || attr.id).toLowerCase();
      if (name.includes("simetria")) areas.symmetry = attr.score;
      else if (name.includes("mandíbula") || name.includes("queixo") || name.includes("jaw") || name.includes("goní")) areas.jawline = Math.max(areas.jawline || 0, attr.score);
      else if (name.includes("pele") || name.includes("skin") || name.includes("rugas")) areas.skin = Math.min(areas.skin ?? 100, attr.score);
      else if (name.includes("olheir") || name.includes("olho") || name.includes("eye")) areas.eyes = attr.score;
      else if (name.includes("hairline") || name.includes("cabelo")) areas.hairline = attr.score;
      else if (name.includes("harmonia") || name.includes("proporção") || name.includes("nariz")) areas.harmony = Math.min(areas.harmony ?? 100, attr.score);
      else if (name.includes("zigomátic") || name.includes("maçã")) areas.cheekbones = attr.score;
      else if (name.includes("masculinidade") || name.includes("maxilar")) areas.harmony = Math.min(areas.harmony ?? 100, attr.score);
    }
  } else if ("categories" in result) {
    type CommonCategory = { id: string; score: number };
    const cats = (result as ExtendedAnalysisResult | AnalysisResult).categories as unknown as CommonCategory[];
    for (const cat of cats) {
      const score = cat.score >= 10 ? cat.score : cat.score * 10;
      if (cat.id === "simetria") areas.symmetry = score;
      else if (cat.id === "estrutura") areas.jawline = score;
      else if (cat.id === "pele") areas.skin = score;
      else if (cat.id === "olhos") areas.eyes = score;
      else if (cat.id === "cabelo") areas.hairline = score;
      else if (cat.id === "harmonia") areas.harmony = score;
    }
  }
  
  return areas;
}

function getPriority(score: number): "critica" | "alta" | "media" {
  if (score < 55) return "critica";
  if (score < 70) return "alta";
  return "media";
}

const areaLabels: Record<string, string> = {
  eyes: "Área dos Olhos",
  skin: "Qualidade da Pele",
  jawline: "Mandíbula / Definição",
  symmetry: "Simetria Facial",
  harmony: "Harmonia & Proporções",
  hairline: "Hairline / Cabelo",
  cheekbones: "Maçãs do Rosto",
};

const areaIcons: Record<string, string> = {
  eyes: "Eye",
  skin: "Droplets",
  jawline: "Target",
  symmetry: "Scan",
  harmony: "Sparkles",
  hairline: "Scissors",
  cheekbones: "Diamond",
};

export function generatePersonalizedPlan(): PersonalizedPlan {
  // Try GER history first, then legacy
  const gerHistory = getGerHistory();
  const legacyHistory = getAnalysisHistory();
  
  const latestResult = gerHistory.length > 0 ? gerHistory[0] : (legacyHistory.length > 0 ? legacyHistory[0] : null);
  
  if (!latestResult) {
    return { bottlenecks: [], trends: [], gerScore: 0, hasAnalysis: false };
  }
  
  const areas = mapAttributesToAreas(latestResult as TrendSource);
  let gerScore = 0;
  if ("ger" in latestResult && typeof latestResult.ger === "number") {
    gerScore = latestResult.ger;
  } else if ("overallScore" in latestResult && typeof latestResult.overallScore === "number") {
    gerScore = Math.round(latestResult.overallScore * 10);
  }
  
  // Build bottlenecks sorted by score (worst first)
  const bottlenecks: FacialBottleneck[] = Object.entries(areas)
    .filter(([, score]) => score < 80) // Only areas with room for improvement
    .sort(([, a], [, b]) => a - b)
    .map(([id, score]) => ({
      id,
      area: areaLabels[id] || id,
      score,
      maxScore: 99,
      priority: getPriority(score),
      icon: areaIcons[id] || "Zap",
    }));
  
  // Get trends for each bottleneck area
  const trends: SmartTrend[] = [];
  for (const bottleneck of bottlenecks) {
    const areaTrends = TREND_DATABASE[bottleneck.id] || [];
    for (const trend of areaTrends) {
      trends.push({ ...trend, areaScore: bottleneck.score });
    }
  }
  
  // Add harmony trends if no specific area trends
  if (trends.length === 0 && TREND_DATABASE.harmony) {
    for (const trend of TREND_DATABASE.harmony) {
      trends.push({ ...trend, areaScore: areas.harmony || 60 });
    }
  }
  
  return { bottlenecks, trends, gerScore, hasAnalysis: true };
}
