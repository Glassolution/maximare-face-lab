import { ExtendedAnalysisResult } from "./rankingSystem";
import { getGerHistory } from "./gerTypes";
import { getAnalysisHistory } from "./mockData";

export interface FacialBottleneck {
  id: string;
  area: string;
  score: number;
  maxScore: number;
  priority: "critica" | "alta" | "media";
  icon: string;
  severity?: number; // 0-10
  impact_visual?: number; // 0-10
}

export interface SmartTrend {
  id: string;
  title: string;
  subtitle: string;
  reason: string; // Justificativa personalizada
  area: string;
  areaScore: number;
  impactEstimate: number; // 1-10
  duration: string;
  frequency: string;
  validation: "Alta" | "Moderada" | "Baixa"; // Evidence level
  science: string;
  steps: { text: string; detail?: string }[];
  disclaimer: string;
  tags: string[];
  category: "skincare" | "exercicio" | "habito" | "procedimento";
  warning?: string;
  time_to_results?: string;
}

export interface PersonalizedPlan {
  bottlenecks: FacialBottleneck[];
  trends: SmartTrend[];
  gerScore: number;
  hasAnalysis: boolean;
  diagnosis?: ExtendedAnalysisResult["structural_diagnosis"];
}

// ─── Intervention Database ───
// Banco estruturado de intervenções para seleção dinâmica

export interface Intervention {
  id: string;
  title: string;
  subtitle: string;
  category: "skincare" | "exercicio" | "habito" | "procedimento";
  targets: string[]; // Areas this helps: "mandibula", "pele", "olhos", "pescoço", "simetria", "gordura", "inchaço"
  evidence_level: "Alta" | "Moderada" | "Baixa";
  science_explanation: string;
  impact_base: number; // 1-10 base impact
  time_to_results_days: number;
  contraindications: string[];
  steps: { text: string; detail?: string }[];
  warning?: string;
  tags: string[];
}

const INTERVENTION_POOL: Intervention[] = [
  // ─── MANDIBULA / ESTRUTURA ───
  {
    id: "mewing-basic",
    title: "Protocolo Mewing (Ortotropia)",
    subtitle: "Postura lingual para suporte maxilar",
    category: "habito",
    targets: ["mandibula", "projecao_mandibular", "alinhamento_cervical", "simetria"],
    evidence_level: "Baixa", // Experimental in adults
    science_explanation: "A teoria ortotrópica sugere que a força da língua no palato (céu da boca) oferece suporte para a maxila, potencialmente influenciando a projeção facial e espaço das vias aéreas a longo prazo.",
    impact_base: 6,
    time_to_results_days: 90,
    contraindications: ["Disfunção grave da ATM", "Uso de aparelhos ortodônticos específicos"],
    steps: [
      { text: "Posição de Repouso", detail: "Mantenha a língua inteira (ponta, meio e fundo) pressionada contra o céu da boca." },
      { text: "Selamento Labial", detail: "Lábios levemente fechados, dentes levemente encostados ou muito próximos." },
      { text: "Respiração Nasal", detail: "Respire EXCLUSIVAMENTE pelo nariz. A boca não deve abrir." },
      { text: "Deglutição", detail: "Ao engolir, use a língua para empurrar a saliva, sem usar as bochechas." }
    ],
    tags: ["Estrutura", "Gratuito", "Longo Prazo"]
  },
  {
    id: "chewing-hypertrophy",
    title: "Hipertrofia de Masseter",
    subtitle: "Aumento da largura mandibular via mastigação",
    category: "exercicio",
    targets: ["mandibula", "definicao_terco_inferior", "largura_facial"],
    evidence_level: "Moderada",
    science_explanation: "O músculo masseter é um músculo esquelético que responde à hipertrofia por tensão mecânica. Mastigação de alimentos duros ou gomas resistentes estimula o crescimento das fibras musculares laterais.",
    impact_base: 8,
    time_to_results_days: 45,
    contraindications: ["Bruxismo", "Dores na ATM", "Dores de cabeça tensionais"],
    steps: [
      { text: "Mastigação Resistida", detail: "Use gomas de mascar mais rígidas (ex: 2-3 gomas normais ou goma falim)." },
      { text: "Distribuição Bilateral", detail: "Mastigue 50% do tempo de cada lado para evitar assimetria." },
      { text: "Volume de Treino", detail: "15-20 minutos por dia, 4-5x por semana. Não exceda para não lesionar a articulação." },
      { text: "Descanso", detail: "Se sentir dor na articulação (perto do ouvido), pare por 3 dias." }
    ],
    warning: "Cuidado: Excesso pode causar problemas na articulação temporomandibular (ATM).",
    tags: ["Muscular", "Definição", "Jawline"]
  },

  // ─── GORDURA / INCHAÇO ───
  {
    id: "sodium-flush",
    title: "Protocolo de Redução de Sódio",
    subtitle: "Eliminação rápida de retenção hídrica facial",
    category: "habito",
    targets: ["sinais_inchaco", "gordura_facial", "definicao_terco_inferior", "regiao_ocular"],
    evidence_level: "Alta",
    science_explanation: "O sódio atrai água para o espaço extracelular. O excesso (comum na dieta moderna) causa edema facial visível, especialmente nas pálpebras e bochechas. A redução aguda gera 'desinchaço' rápido.",
    impact_base: 9, // High immediate impact
    time_to_results_days: 5,
    contraindications: ["Hipotensão severa (consultar médico)"],
    steps: [
      { text: "Limite Diário", detail: "Mantenha ingestão de sódio abaixo de 1500mg/dia por 1 semana." },
      { text: "Hidratação Compensatória", detail: "Beba 3-4 litros de água. A água ajuda a excretar o sódio acumulado." },
      { text: "Potássio", detail: "Aumente ingestão de banana, batata doce ou água de coco (balanço Na/K)." },
      { text: "Evite Processados", detail: "Corte embutidos, molhos prontos e fast food." }
    ],
    tags: ["Rápido", "Definição", "Desinchaço"]
  },
  {
    id: "lymphatic-drainage",
    title: "Drenagem Linfática Facial",
    subtitle: "Massagem para remover fluídos estagnados",
    category: "exercicio",
    targets: ["sinais_inchaco", "regiao_ocular", "textura_pele"],
    evidence_level: "Moderada",
    science_explanation: "A estimulação manual dos canais linfáticos auxilia o retorno venoso e a remoção de metabólitos e fluidos intersticiais, reduzindo o aspecto 'puffy' do rosto.",
    impact_base: 7,
    time_to_results_days: 1, // Immediate but temporary
    contraindications: ["Acne inflamatória ativa (pode espalhar bactérias)", "Feridas abertas"],
    steps: [
      { text: "Preparação", detail: "Use um óleo facial ou hidratante para deslizar. Lave as mãos." },
      { text: "Pescoço Primeiro", detail: "Massageie do lóbulo da orelha para baixo, em direção à clavícula (abrir canais)." },
      { text: "Mandíbula", detail: "Do queixo em direção à orelha, com pressão leve." },
      { text: "Olhos", detail: "Do canto interno para as têmporas, muito suavemente (dedo anelar)." },
      { text: "Testa", detail: "Do centro para as laterais." }
    ],
    tags: ["Relaxamento", "Spa", "Manutenção"]
  },
  {
    id: "caloric-deficit",
    title: "Déficit Calórico Controlado",
    subtitle: "Redução de gordura corporal total",
    category: "habito",
    targets: ["gordura_facial", "definicao_terco_inferior", "projecao_mandibular"],
    evidence_level: "Alta",
    science_explanation: "Não existe perda de gordura localizada. Para perder gordura no rosto, é necessário reduzir o percentual de gordura corporal total através de balanço energético negativo.",
    impact_base: 9,
    time_to_results_days: 45,
    contraindications: ["Transtornos alimentares", "Baixo peso (IMC < 18.5)"],
    steps: [
      { text: "Cálculo TDEE", detail: "Calcule seu gasto calórico total diário." },
      { text: "Déficit Moderado", detail: "Consuma 300-500kcal a menos que seu gasto. Perda de 0.5kg/semana." },
      { text: "Proteína Alta", detail: "2g de proteína por kg de peso para preservar músculo e saciedade." },
      { text: "Paciência", detail: "O rosto costuma ser um dos últimos lugares a perder gordura em algumas pessoas." }
    ],
    tags: ["Fitness", "Perda de Peso", "Essencial"]
  },

  // ─── PELE ───
  {
    id: "basic-skincare",
    title: "A Tríade do Skincare",
    subtitle: "Limpeza, Hidratação e Proteção",
    category: "skincare",
    targets: ["textura_pele", "qualidade_pele", "rugas"],
    evidence_level: "Alta",
    science_explanation: "Manter a barreira cutânea íntegra e protegida da radiação UV é a intervenção com maior respaldo científico para saúde e estética da pele a longo prazo.",
    impact_base: 8,
    time_to_results_days: 21,
    contraindications: ["Alergia a componentes específicos"],
    steps: [
      { text: "Limpeza (Manhã/Noite)", detail: "Gel de limpeza suave (sem sulfatos agressivos)." },
      { text: "Hidratação", detail: "Hidratante adequado ao seu tipo de pele (gel para oleosa, creme para seca)." },
      { text: "Proteção Solar (Manhã)", detail: "FPS 30 ou superior. O sol é responsável por 80% do envelhecimento visível." }
    ],
    tags: ["Essencial", "Saúde", "Básico"]
  },
  {
    id: "retinol-protocol",
    title: "Protocolo Retinóide",
    subtitle: "Renovação celular acelerada",
    category: "skincare",
    targets: ["textura_pele", "rugas", "acne", "manchas"],
    evidence_level: "Alta",
    science_explanation: "Derivados de Vitamina A (retinol/tretinoína) aumentam o turnover celular e estimulam colágeno. É o 'padrão ouro' da dermatologia anti-aging.",
    impact_base: 9,
    time_to_results_days: 60,
    contraindications: ["Gravidez", "Pele extremamente sensível", "Rosácea (consultar médico)"],
    steps: [
      { text: "Introdução Gradual", detail: "Comece 2x na semana à noite. Aumente frequência conforme tolerância." },
      { text: "Quantidade", detail: "Use o tamanho de uma ervilha para o rosto todo. Mais não é melhor." },
      { text: "Sanduíche", detail: "Aplique hidratante antes e depois para reduzir irritação." },
      { text: "Obrigatório", detail: "Uso de protetor solar rigoroso durante o dia (a pele fica fotossensível)." }
    ],
    warning: "Pode causar 'purging' (piora inicial) e descamação nas primeiras semanas.",
    tags: ["Avançado", "Anti-aging", "Textura"]
  },

  // ─── OLHOS ───
  {
    id: "ice-eyes",
    title: "Crioterapia Periorbital",
    subtitle: "Gelo para vasoconstrição e desinchaço",
    category: "habito",
    targets: ["regiao_ocular", "sinais_inchaco", "olheiras"],
    evidence_level: "Moderada",
    science_explanation: "O frio causa vasoconstrição imediata, reduzindo o fluxo sanguíneo superficial (diminuindo a cor roxa vascular) e o extravasamento de líquidos (edema).",
    impact_base: 6,
    time_to_results_days: 1, // Immediate
    contraindications: ["Urticária ao frio", "Sensibilidade extrema"],
    steps: [
      { text: "Gelo Protegido", detail: "Nunca aplique gelo direto na pele. Envolva em um pano fino ou use roller gelado." },
      { text: "Massagem", detail: "Faça movimentos circulares ao redor dos olhos por 3-5 minutos pela manhã." },
      { text: "Consistência", detail: "Faça diariamente ao acordar para combater o inchaço matinal." }
    ],
    tags: ["Rápido", "Manhã", "Olhar"]
  },
  {
    id: "volufiline-eyes",
    title: "Volufiline Tópico",
    subtitle: "Estimulação lipídica para olheiras profundas",
    category: "skincare",
    targets: ["regiao_ocular", "olheiras"],
    evidence_level: "Baixa", // Cosmetic ingredient, less clinical data than drugs
    science_explanation: "Sarsasapogenina (Volufiline) estimula a diferenciação e proliferação de adipócitos. Usado para preencher áreas que perderam volume, como a calha lacrimal (olheira funda).",
    impact_base: 5,
    time_to_results_days: 60,
    contraindications: [],
    steps: [
      { text: "Aplicação Local", detail: "Aplique APENAS na área funda da olheira. Não espalhe para áreas que não quer aumentar." },
      { text: "Massagem", detail: "Massageie até absorção completa." },
      { text: "Frequência", detail: "2x ao dia (manhã e noite)." }
    ],
    warning: "Resultados variam muito entre indivíduos.",
    tags: ["Experimental", "Volume", "Olheiras"]
  },

  // ─── PESCOÇO / POSTURA ───
  {
    id: "neck-training",
    title: "Fortalecimento Cervical",
    subtitle: "Pescoço mais largo para masculinidade e suporte",
    category: "exercicio",
    targets: ["alinhamento_cervical", "pescoço", "masculinidade_estrutural"],
    evidence_level: "Alta", // Muscle hypertrophy logic holds
    science_explanation: "Um pescoço desenvolvido (esternocleidomastóideo e trapézio) melhora a estética facial masculina e ajuda a manter a postura correta da cabeça.",
    impact_base: 7,
    time_to_results_days: 60,
    contraindications: ["Hérnia de disco cervical", "Histórico de lesão na coluna"],
    steps: [
      { text: "Neck Curls", detail: "Deitado de costas (cabeça para fora do banco), flexione o pescoço levando o queixo ao peito. 3x15." },
      { text: "Neck Extensions", detail: "Deitado de bruços, levante a cabeça olhando para cima. 3x15." },
      { text: "Progressão", detail: "Adicione peso (anilha na testa/nuca com toalha) gradualmente." },
      { text: "Segurança", detail: "Movimentos controlados, sem trancos." }
    ],
    tags: ["Muscular", "Masculinidade", "Postura"]
  },
  {
    id: "chin-tucks",
    title: "Chin Tucks (Correção Postural)",
    subtitle: "Realinhamento da cabeça e pescoço",
    category: "exercicio",
    targets: ["alinhamento_cervical", "projecao_mandibular", "papada"],
    evidence_level: "Alta", // Physiotherapy standard
    science_explanation: "Combate a 'Forward Head Posture' (cabeça projetada à frente), que cria a ilusão de queixo fraco e papada. Realinhar a vértebra cervical melhora instantaneamente o perfil.",
    impact_base: 8,
    time_to_results_days: 30,
    contraindications: ["Dor aguda ao movimento"],
    steps: [
      { text: "Movimento", detail: "Em pé, puxe a cabeça para trás horizontalmente (criando 'papada' proposital), como se fugisse de um cheiro ruim." },
      { text: "Segurar", detail: "Mantenha a posição retraída por 5 segundos." },
      { text: "Repetição", detail: "Faça 10 repetições, 3x ao dia." },
      { text: "Consciência", detail: "Monitore sua postura ao usar celular e computador." }
    ],
    tags: ["Postura", "Perfil", "Saúde"]
  }
];

// ─── Logic ───

export function generatePersonalizedPlan(analysis?: ExtendedAnalysisResult): PersonalizedPlan {
  // Fallback if no analysis provided
  if (!analysis) {
    return { bottlenecks: [], trends: [], gerScore: 0, hasAnalysis: false };
  }

  // 1. Detect Logic Mode
  const diag = analysis.structural_diagnosis;
  const isDynamic = !!diag;

  // 2. Determine GER Score
  let gerScore = analysis.ger ?? 0;
  if (!gerScore && analysis.overallScore) gerScore = Math.round(analysis.overallScore * 10);

  // 3. Generate Bottlenecks & Select Trends
  let bottlenecks: FacialBottleneck[] = [];
  let selectedTrends: SmartTrend[] = [];

  if (isDynamic && diag) {
    // ─── DYNAMIC MODE (User Request) ───
    
    // Map priorities to bottlenecks
    bottlenecks = diag.prioridades.map((area, index) => {
      const severity = diag.severidade?.[area] ?? 5;
      const impact = diag.impacto_visual?.[area] ?? 5;
      
      // Map area name to icon
      let icon = "Zap";
      const al = area.toLowerCase();
      if (al.includes("olho") || al.includes("ocular")) icon = "Eye";
      else if (al.includes("pele") || al.includes("textura")) icon = "Droplets";
      else if (al.includes("mandibula") || al.includes("queixo") || al.includes("terco")) icon = "Target";
      else if (al.includes("cabelo")) icon = "Scissors";
      else if (al.includes("simetria")) icon = "Scan";
      
      return {
        id: area,
        area: area.charAt(0).toUpperCase() + area.slice(1).replace(/_/g, " "),
        score: Math.max(0, 100 - (severity * 10)), // Reverse severity to score equivalent
        maxScore: 100,
        priority: index === 0 ? "critica" : index === 1 ? "alta" : "media",
        icon,
        severity,
        impact_visual: impact
      };
    });

    // Select Interventions
    const candidates = INTERVENTION_POOL.filter(intervention => {
      // Check if intervention targets any of the diagnosis priorities or specific issues
      // Also check specific diagnosis values (e.g., only recommend mewing if cervical alignment is not good or jaw is receded)
      
      const helpsPriority = intervention.targets.some(t => diag.prioridades.includes(t));
      
      // Specific Conditions Logic
      if (intervention.id === "sodium-flush" && diag.sinais_inchaco === "Ausentes") return false;
      if (intervention.id === "caloric-deficit" && diag.gordura_facial === "Baixa") return false;
      if (intervention.id === "chin-tucks" && diag.alinhamento_cervical === "Neutro") return false; // Already good
      
      return helpsPriority;
    });

    // Rank candidates
    const ranked = candidates.map(intervention => {
      let score = intervention.impact_base;
      
      // Boost if it helps top priority
      if (intervention.targets.includes(diag.prioridades[0])) score += 3;
      
      // Boost by evidence
      if (intervention.evidence_level === "Alta") score += 2;
      
      return { ...intervention, score };
    }).sort((a, b) => b.score - a.score);

    // Pick top 3-4 unique
    selectedTrends = ranked.slice(0, 4).map(inv => {
      // Generate Dynamic Justification
      let justification = `Recomendado para melhorar ${inv.targets[0].replace(/_/g, " ")}.`;
      
      if (inv.targets.includes("gordura_facial") && diag.gordura_facial === "Alta") {
        justification = "Sua estimativa de gordura facial indica que reduzir o percentual global é o passo mais impactante para definição.";
      } else if (inv.targets.includes("sinais_inchaco") && diag.sinais_inchaco === "Visíveis") {
        justification = "Sinais visíveis de inchaço estão mascarando sua estrutura óssea. Esta intervenção foca em drenar esse líquido.";
      } else if (inv.targets.includes("alinhamento_cervical") && diag.alinhamento_cervical !== "Neutro") {
        justification = `Seu alinhamento cervical foi detectado como '${diag.alinhamento_cervical}', o que prejudica a estética do perfil.`;
      } else if (inv.targets.includes("projecao_mandibular") && diag.projecao_mandibular === "Recuada") {
        justification = "Sua projeção mandibular está abaixo do potencial. Estimular a musculatura e postura pode ajudar a compensar.";
      }

      return {
        id: inv.id,
        title: inv.title,
        subtitle: inv.subtitle,
        reason: justification,
        area: inv.targets[0],
        areaScore: 50, // Placeholder
        impactEstimate: inv.impact_base,
        duration: `${inv.time_to_results_days} dias`,
        frequency: "Ver instruções",
        validation: inv.evidence_level,
        science: inv.science_explanation,
        steps: inv.steps,
        disclaimer: inv.warning || "Consulte um profissional.",
        tags: inv.tags,
        category: inv.category
      };
    });

  } else {
    // ─── LEGACY MODE (Fallback) ───
    // If no structural diagnosis is present, return empty or minimal plan to avoid crashing
    // OR we could port the old logic here if we wanted to support old scans.
    // For now, let's just return a basic message or empty if no diagnosis.
    // But better to keep the old logic for backward compatibility? 
    // The user wants to REMOVE generic recommendations.
    // So if no diagnosis, maybe we just show nothing or a "Re-analyze" prompt.
    // But for safety, I'll map the old categories if available.
    
    // (Simulated legacy logic for safety - stripped down)
     const areas: Record<string, number> = {};
     if (analysis.categories) {
       analysis.categories.forEach(c => areas[c.id] = c.score);
     }
     
     // ... legacy mapping skipped to enforce new system usage ...
  }

  return { 
    bottlenecks, 
    trends: selectedTrends, 
    gerScore, 
    hasAnalysis: true,
    diagnosis: diag 
  };
}
