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
  common_errors?: string[];
  success_signs?: string[];
  frequency: string;
  session_duration?: string;
  disclaimer: string;
  tags: string[];
  category: "skincare" | "exercicio" | "habito" | "procedimento";
  warning?: string;
  time_to_results?: string;
  benefit_type?: "Estrutural" | "Temporário" | "Comportamental";
}

export interface PersonalizedPlan {
  bottlenecks: FacialBottleneck[];
  trends: SmartTrend[];
  gerScore: number;
  hasAnalysis: boolean;
  diagnosis?: ExtendedAnalysisResult["structural_diagnosis"];
}

// ─── HELPER: Generate Structural Diagnosis (Internal JSON) ───
function generateStructuralDiagnosis(analysis: ExtendedAnalysisResult): ExtendedAnalysisResult["structural_diagnosis"] {
  // Extract or default values
  const ger = analysis.ger || analysis.overallScore * 10 || 50;
  const cats = analysis.categories || [];
  
  const getScore = (id: string) => cats.find(c => c.id === id)?.score || (ger / 10);
  
  // Scores (0-10)
  const jawScore = getScore("jawline");
  const skinScore = getScore("skin");
  const eyeScore = getScore("eyes");
  const symScore = getScore("symmetry");
  const fatScore = 10 - (getScore("cheekbones")); // Inverse logic: high cheekbones often means low fat/good definition
  
  // Generate Internal Diagnosis Object
  // Logic: 
  // - Low jaw score -> Receded/Weak projection
  // - Low skin score -> Texture/Acne issues
  // - Low eye score -> Puffiness/Dark circles
  // - High fat score -> High body fat/Swelling
  
  const diag: ExtendedAnalysisResult["structural_diagnosis"] = {
    projecao_mandibular: jawScore > 7 ? "Boa projeção" : jawScore > 5 ? "Média" : "Recuada",
    alinhamento_cervical: "Análise não conclusiva (foto frontal)", // Default unless side profile
    definicao_terco_inferior: jawScore > 6 ? "Definido" : "Pouca definição",
    gordura_facial: fatScore > 6 ? "Alta" : fatScore > 4 ? "Média" : "Baixa",
    simetria_estrutural: symScore > 8 ? "Alta" : symScore > 6 ? "Média" : "Baixa",
    textura_pele: skinScore > 7 ? "Uniforme" : "Irregular",
    regiao_ocular: eyeScore > 7 ? "Descansada" : "Sinais de fadiga",
    sinais_inchaco: fatScore > 7 ? "Visíveis" : "Ausentes",
    prioridades: [],
    severidade: {},
    impacto_visual: {}
  };

  // Determine Priorities based on lowest scores
  const areas = [
    { id: "projecao_mandibular", score: jawScore, label: "Mandíbula" },
    { id: "textura_pele", score: skinScore, label: "Pele" },
    { id: "regiao_ocular", score: eyeScore, label: "Olhos" },
    { id: "simetria_estrutural", score: symScore, label: "Simetria" },
    { id: "gordura_facial", score: 10 - fatScore, label: "Gordura Facial" } // Invert fat for priority (low score = bad)
  ];

  // Sort by lowest score (biggest problems first)
  const sortedAreas = areas.sort((a, b) => a.score - b.score);
  
  diag.prioridades = sortedAreas.slice(0, 3).map(a => a.id);
  
  // Calculate Severity & Impact (0-10)
  diag.severidade = {};
  diag.impacto_visual = {};
  
  areas.forEach(a => {
    // Severity is inverse of score (lower score = higher severity)
    const severity = Math.max(1, Math.min(10, Math.round((10 - a.score) * 1.2))); 
    diag.severidade![a.id] = severity;
    
    // Impact estimate (heuristic)
    // Jaw/Fat usually have higher visual impact than skin texture
    let impactMod = 1;
    if (a.id === "projecao_mandibular" || a.id === "gordura_facial") impactMod = 1.2;
    if (a.id === "textura_pele") impactMod = 0.8;
    
    diag.impacto_visual![a.id] = Math.max(1, Math.min(10, Math.round(severity * impactMod)));
  });

  return diag;
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
  benefit_type: "Estrutural" | "Temporário" | "Comportamental";
  science_explanation: string;
  impact_base: number; // 1-10 base impact
  time_to_results_days: number;
  contraindications: string[];
  steps: { text: string; detail?: string }[];
  common_errors?: string[]; // New field
  success_signs?: string[]; // New field
  frequency: string; // New field
  session_duration: string; // New field
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
    benefit_type: "Estrutural",
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
    common_errors: ["Empurrar os dentes da frente (pode entortar)", "Não levantar a parte de trás da língua", "Tencionar a mandíbula"],
    success_signs: ["Sensação de pressão no palato", "Respiração nasal facilitada", "Leve cansaço na base da língua"],
    frequency: "24/7 (tornar hábito)",
    session_duration: "Contínuo",
    tags: ["Estrutura", "Gratuito", "Longo Prazo"]
  },
  {
    id: "chewing-hypertrophy",
    title: "Hipertrofia de Masseter",
    subtitle: "Aumento da largura mandibular via mastigação",
    category: "exercicio",
    targets: ["mandibula", "definicao_terco_inferior", "largura_facial"],
    evidence_level: "Moderada",
    benefit_type: "Estrutural",
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
    common_errors: ["Mastigar de boca aberta", "Exceder o tempo (causa DTM)", "Mastigar só de um lado"],
    success_signs: ["Pump muscular (inchaço temporário) após o treino", "Músculo mais rígido ao toque"],
    frequency: "4-5x por semana",
    session_duration: "15-20 min",
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
    benefit_type: "Temporário",
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
    common_errors: ["Beber pouca água (o corpo retém mais)", "Cortar o sal totalmente por muito tempo (perigoso)"],
    success_signs: ["Rosto mais fino pela manhã", "Menos marcas de travesseiro ao acordar", "Anéis mais frouxos nos dedos"],
    frequency: "Ciclos de 1 semana",
    session_duration: "Diário",
    tags: ["Rápido", "Definição", "Desinchaço"]
  },
  {
    id: "lymphatic-drainage",
    title: "Drenagem Linfática Facial",
    subtitle: "Massagem para remover fluídos estagnados",
    category: "exercicio",
    targets: ["sinais_inchaco", "regiao_ocular", "textura_pele"],
    evidence_level: "Moderada",
    benefit_type: "Temporário",
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
    common_errors: ["Muita pressão (fecha os vasos linfáticos)", "Fazer sem óleo (estica a pele)", "Esquecer o pescoço"],
    success_signs: ["Redução imediata do inchaço matinal", "Pele com viço"],
    frequency: "Diariamente (manhã)",
    session_duration: "5 min",
    tags: ["Relaxamento", "Spa", "Manutenção"]
  },
  {
    id: "caloric-deficit",
    title: "Déficit Calórico Controlado",
    subtitle: "Redução de gordura corporal total",
    category: "habito",
    targets: ["gordura_facial", "definicao_terco_inferior", "projecao_mandibular"],
    evidence_level: "Alta",
    benefit_type: "Estrutural",
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
    common_errors: ["Corte calórico drástico (perda de músculo)", "Pouca proteína (flacidez)", "Esperar resultado em 1 semana"],
    success_signs: ["Perda de peso na balança", "Roupas mais largas", "Definição da mandíbula aparecendo"],
    frequency: "Diário",
    session_duration: "Contínuo",
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
    benefit_type: "Comportamental",
    science_explanation: "Manter a barreira cutânea íntegra e protegida da radiação UV é a intervenção com maior respaldo científico para saúde e estética da pele a longo prazo.",
    impact_base: 8,
    time_to_results_days: 21,
    contraindications: ["Alergia a componentes específicos"],
    steps: [
      { text: "Limpeza (Manhã/Noite)", detail: "Gel de limpeza suave (sem sulfatos agressivos)." },
      { text: "Hidratação", detail: "Hidratante adequado ao seu tipo de pele (gel para oleosa, creme para seca)." },
      { text: "Proteção Solar (Manhã)", detail: "FPS 30 ou superior. O sol é responsável por 80% do envelhecimento visível." }
    ],
    common_errors: ["Não usar protetor em dias nublados", "Lavar o rosto com sabonete de corpo", "Esfregar a toalha no rosto"],
    success_signs: ["Pele menos oleosa/seca", "Menos acne", "Textura mais suave"],
    frequency: "2x ao dia",
    session_duration: "3 min",
    tags: ["Essencial", "Saúde", "Básico"]
  },
  {
    id: "retinol-protocol",
    title: "Protocolo Retinóide",
    subtitle: "Renovação celular acelerada",
    category: "skincare",
    targets: ["textura_pele", "rugas", "acne", "manchas"],
    evidence_level: "Alta",
    benefit_type: "Estrutural",
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
    common_errors: ["Usar de manhã (o sol inativa)", "Usar muito produto", "Misturar com ácidos fortes"],
    success_signs: ["Pele mais lisa e brilhante (glow)", "Redução de linhas finas", "Poros menos visíveis"],
    frequency: "Noite (progressivo)",
    session_duration: "1 min",
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
    benefit_type: "Temporário",
    science_explanation: "O frio causa vasoconstrição imediata, reduzindo o fluxo sanguíneo superficial (diminuindo a cor roxa vascular) e o extravasamento de líquidos (edema).",
    impact_base: 6,
    time_to_results_days: 1, // Immediate
    contraindications: ["Urticária ao frio", "Sensibilidade extrema"],
    steps: [
      { text: "Gelo Protegido", detail: "Nunca aplique gelo direto na pele. Envolva em um pano fino ou use roller gelado." },
      { text: "Massagem", detail: "Faça movimentos circulares ao redor dos olhos por 3-5 minutos pela manhã." },
      { text: "Consistência", detail: "Faça diariamente ao acordar para combater o inchaço matinal." }
    ],
    common_errors: ["Queimar a pele com gelo direto", "Fazer por muito tempo (>10 min)", "Pressionar o globo ocular"],
    success_signs: ["Olhar mais aberto", "Menos inchaço nas pálpebras"],
    frequency: "Diariamente (manhã)",
    session_duration: "5 min",
    tags: ["Rápido", "Manhã", "Olhar"]
  },
  {
    id: "volufiline-eyes",
    title: "Volufiline Tópico",
    subtitle: "Estimulação lipídica para olheiras profundas",
    category: "skincare",
    targets: ["regiao_ocular", "olheiras"],
    evidence_level: "Baixa", // Cosmetic ingredient, less clinical data than drugs
    benefit_type: "Estrutural",
    science_explanation: "Sarsasapogenina (Volufiline) estimula a diferenciação e proliferação de adipócitos. Usado para preencher áreas que perderam volume, como a calha lacrimal (olheira funda).",
    impact_base: 5,
    time_to_results_days: 60,
    contraindications: [],
    steps: [
      { text: "Aplicação Local", detail: "Aplique APENAS na área funda da olheira. Não espalhe para áreas que não quer aumentar." },
      { text: "Massagem", detail: "Massageie até absorção completa." },
      { text: "Frequência", detail: "2x ao dia (manhã e noite)." }
    ],
    common_errors: ["Aplicar no rosto todo (pode inchar)", "Esperar resultado em 1 semana"],
    success_signs: ["Olheira menos profunda", "Menos sombra na calha lacrimal"],
    frequency: "2x ao dia",
    session_duration: "2 min",
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
    benefit_type: "Estrutural",
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
    common_errors: ["Usar impulso", "Amplitude incompleta", "Excesso de carga inicial"],
    success_signs: ["Aumento da medida do pescoço (fita métrica)", "Camisas mais justas no colarinho"],
    frequency: "2-3x por semana",
    session_duration: "15 min",
    tags: ["Muscular", "Masculinidade", "Postura"]
  },
  {
    id: "chin-tucks",
    title: "Chin Tucks (Correção Postural)",
    subtitle: "Realinhamento da cabeça e pescoço",
    category: "exercicio",
    targets: ["alinhamento_cervical", "projecao_mandibular", "papada"],
    evidence_level: "Alta", // Physiotherapy standard
    benefit_type: "Comportamental",
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
    common_errors: ["Inclinar a cabeça para cima ou baixo (deve ser horizontal)", "Tencionar os ombros"],
    success_signs: ["Melhora na postura natural", "Orelha alinhada com ombro no espelho"],
    frequency: "Diariamente (várias vezes)",
    session_duration: "2 min",
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
  let diag = analysis.structural_diagnosis;
  
  // FORCE GENERATION IF MISSING (User Requirement 1)
  if (!diag) {
    diag = generateStructuralDiagnosis(analysis);
  }
  
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
      
      if (inv.targets.includes("gordura_facial") && diag!.gordura_facial === "Alta") {
        justification = "Sua estimativa de gordura facial indica que reduzir o percentual global é o passo mais impactante para definição.";
      } else if (inv.targets.includes("sinais_inchaco") && diag!.sinais_inchaco === "Visíveis") {
        justification = "Sinais visíveis de inchaço estão mascarando sua estrutura óssea. Esta intervenção foca em drenar esse líquido.";
      } else if (inv.targets.includes("alinhamento_cervical") && diag!.alinhamento_cervical !== "Neutro" && diag!.alinhamento_cervical !== "Análise não conclusiva (foto frontal)") {
        justification = `Seu alinhamento cervical foi detectado como '${diag!.alinhamento_cervical}', o que prejudica a estética do perfil.`;
      } else if (inv.targets.includes("projecao_mandibular") && diag!.projecao_mandibular === "Recuada") {
        justification = "Sua projeção mandibular está abaixo do potencial. Estimular a musculatura e postura pode ajudar a compensar.";
      } else if (inv.targets.includes("textura_pele") && diag!.textura_pele === "Irregular") {
        justification = "Irregularidades na textura da pele foram detectadas. Este protocolo é específico para renovação celular.";
      } else if (inv.targets.includes("regiao_ocular") && diag!.regiao_ocular === "Sinais de fadiga") {
        justification = "Sinais de fadiga na região ocular reduzem a vitalidade do rosto. Focar na circulação local trará resultados rápidos.";
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
        frequency: inv.frequency || "Ver instruções",
        validation: inv.evidence_level,
        science: inv.science_explanation,
        steps: inv.steps,
        disclaimer: inv.warning || "Consulte um profissional.",
        tags: inv.tags,
        category: inv.category,
        common_errors: inv.common_errors,
        success_signs: inv.success_signs,
        session_duration: inv.session_duration,
        benefit_type: inv.benefit_type
      };
    });

  } else {
    // ─── LEGACY MODE (Fallback) ───
    // This block should theoretically not be reached due to forced generation,
    // but kept for type safety.
  }

  return { 
    bottlenecks, 
    trends: selectedTrends, 
    gerScore, 
    hasAnalysis: true,
    diagnosis: diag 
  };
}
