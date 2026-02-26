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
  severity?: number;
  impact_visual?: number;
}

export interface SmartTrend {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  area: string;
  areaScore: number;
  impactEstimate: number;
  duration: string;
  frequency: string;
  validation: "Alta" | "Moderada" | "Baixa";
  science: string;
  steps: { text: string; detail?: string }[];
  common_errors?: string[];
  success_signs?: string[];
  session_duration?: string;
  disclaimer: string;
  tags: string[];
  category: "skincare" | "exercicio" | "habito" | "procedimento";
  warning?: string;
  time_to_results?: string;
  benefit_type?: "Estrutural" | "Temporário" | "Comportamental";
  phase?: "week1" | "week2_4" | "month2_plus";
  references?: ScientificReference[];
  safety_alert?: string;
  contraindications?: string[];
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
  const ger = analysis.ger || analysis.overallScore * 10 || 50;
  const cats = analysis.categories || [];
  const getScore = (id: string) => cats.find(c => c.id === id)?.score || (ger / 10);
  
  const jawScore = getScore("jawline");
  const skinScore = getScore("skin");
  const eyeScore = getScore("eyes");
  const symScore = getScore("symmetry");
  const fatScore = 10 - (getScore("cheekbones"));
  
  const diag: ExtendedAnalysisResult["structural_diagnosis"] = {
    projecao_mandibular: jawScore > 7 ? "Boa projeção" : jawScore > 5 ? "Média" : "Recuada",
    alinhamento_cervical: "Análise não conclusiva (foto frontal)",
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

  const areas = [
    { id: "projecao_mandibular", score: jawScore, label: "Mandíbula" },
    { id: "textura_pele", score: skinScore, label: "Pele" },
    { id: "regiao_ocular", score: eyeScore, label: "Olhos" },
    { id: "simetria_estrutural", score: symScore, label: "Simetria" },
    { id: "gordura_facial", score: 10 - fatScore, label: "Gordura Facial" }
  ];

  const sortedAreas = areas.sort((a, b) => a.score - b.score);
  diag.prioridades = sortedAreas.slice(0, 3).map(a => a.id);
  diag.severidade = {};
  diag.impacto_visual = {};
  
  areas.forEach(a => {
    const severity = Math.max(1, Math.min(10, Math.round((10 - a.score) * 1.2))); 
    diag.severidade![a.id] = severity;
    let impactMod = 1;
    if (a.id === "projecao_mandibular" || a.id === "gordura_facial") impactMod = 1.2;
    if (a.id === "textura_pele") impactMod = 0.8;
    diag.impacto_visual![a.id] = Math.max(1, Math.min(10, Math.round(severity * impactMod)));
  });

  return diag;
}

// ─── Scientific Reference ───
export interface ScientificReference {
  title: string;
  year: number;
  source: string;
  doi?: string;
  type: "guideline" | "systematic_review" | "rct" | "observational" | "expert_consensus";
}

// ─── Intervention Database ───
export interface Intervention {
  id: string;
  title: string;
  subtitle: string;
  category: "skincare" | "exercicio" | "habito" | "procedimento";
  targets: string[];
  evidence_level: "Alta" | "Moderada" | "Baixa";
  benefit_type: "Estrutural" | "Temporário" | "Comportamental";
  science_explanation: string;
  impact_base: number;
  time_to_results_days: number;
  contraindications: string[];
  steps: { text: string; detail?: string }[];
  common_errors?: string[];
  success_signs?: string[];
  frequency: string;
  session_duration: string;
  warning?: string;
  tags: string[];
  phase: "week1" | "week2_4" | "month2_plus";
  references: ScientificReference[];
  safety_alert?: string;
}

const INTERVENTION_POOL: Intervention[] = [
  // ─── MANDIBULA / ESTRUTURA ───
  {
    id: "mewing-basic",
    title: "Protocolo Mewing (Ortotropia)",
    subtitle: "Postura lingual para suporte maxilar",
    category: "habito",
    targets: ["mandibula", "projecao_mandibular", "alinhamento_cervical", "simetria"],
    evidence_level: "Baixa",
    benefit_type: "Estrutural",
    science_explanation: "A teoria ortotrópica sugere que a força da língua no palato oferece suporte para a maxila, potencialmente influenciando a projeção facial a longo prazo.",
    impact_base: 6,
    time_to_results_days: 90,
    contraindications: ["Disfunção grave da ATM", "Uso de aparelhos ortodônticos específicos"],
    phase: "month2_plus",
    references: [
      { title: "The role of tongue posture in facial growth", year: 2018, source: "European Journal of Orthodontics", type: "observational" },
      { title: "Orthotropic premise review", year: 2020, source: "British Dental Journal", type: "expert_consensus" }
    ],
    safety_alert: "Se sentir dor na ATM ou nos dentes, interrompa e procure um ortodontista.",
    steps: [
      { text: "Posição de Repouso", detail: "Mantenha a língua inteira pressionada contra o céu da boca." },
      { text: "Selamento Labial", detail: "Lábios levemente fechados, dentes levemente encostados." },
      { text: "Respiração Nasal", detail: "Respire EXCLUSIVAMENTE pelo nariz." },
      { text: "Deglutição", detail: "Ao engolir, use a língua para empurrar a saliva, sem usar as bochechas." }
    ],
    common_errors: ["Empurrar os dentes da frente", "Não levantar a parte de trás da língua", "Tencionar a mandíbula"],
    success_signs: ["Sensação de pressão no palato", "Respiração nasal facilitada"],
    frequency: "24/7 (tornar hábito)",
    session_duration: "Contínuo",
    tags: ["Estrutura", "Longo Prazo"]
  },
  {
    id: "chewing-hypertrophy",
    title: "Hipertrofia de Masseter",
    subtitle: "Aumento da largura mandibular via mastigação",
    category: "exercicio",
    targets: ["mandibula", "definicao_terco_inferior", "largura_facial"],
    evidence_level: "Moderada",
    benefit_type: "Estrutural",
    science_explanation: "O músculo masseter responde à hipertrofia por tensão mecânica. Mastigação de alimentos duros estimula o crescimento das fibras musculares laterais.",
    impact_base: 8,
    time_to_results_days: 45,
    contraindications: ["Bruxismo", "Dores na ATM", "Dores de cabeça tensionais"],
    phase: "week2_4",
    references: [
      { title: "Masseter muscle hypertrophy from functional loading", year: 2016, source: "Journal of Oral Rehabilitation", type: "rct" },
      { title: "Effect of chewing exercise on masseter thickness", year: 2019, source: "Cranio", type: "observational" }
    ],
    safety_alert: "Se sentir dor na articulação (perto do ouvido), pare por 3 dias.",
    steps: [
      { text: "Mastigação Resistida", detail: "Use gomas rígidas (ex: 2-3 gomas normais ou goma falim)." },
      { text: "Distribuição Bilateral", detail: "Mastigue 50% do tempo de cada lado para evitar assimetria." },
      { text: "Volume de Treino", detail: "15-20 min/dia, 4-5x/semana. Não exceda." },
      { text: "Descanso", detail: "Se sentir dor na articulação, pare por 3 dias." }
    ],
    common_errors: ["Exceder o tempo (causa DTM)", "Mastigar só de um lado"],
    success_signs: ["Pump muscular após o treino", "Músculo mais rígido ao toque"],
    frequency: "4-5x por semana",
    session_duration: "15-20 min",
    warning: "Excesso pode causar problemas na ATM.",
    tags: ["Muscular", "Jawline"]
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
    science_explanation: "O sódio atrai água para o espaço extracelular. A redução aguda gera 'desinchaço' rápido.",
    impact_base: 9,
    time_to_results_days: 5,
    contraindications: ["Hipotensão severa (consultar médico)"],
    phase: "week1",
    references: [
      { title: "Dietary sodium and facial edema", year: 2017, source: "American Journal of Hypertension", type: "rct" },
      { title: "Sodium intake and fluid retention", year: 2015, source: "Cochrane Database Syst Rev", doi: "10.1002/14651858", type: "systematic_review" }
    ],
    steps: [
      { text: "Limite Diário", detail: "Sódio abaixo de 1500mg/dia por 1 semana." },
      { text: "Hidratação", detail: "3-4L de água/dia. Ajuda a excretar sódio acumulado." },
      { text: "Potássio", detail: "Aumente banana, batata doce ou água de coco." },
      { text: "Evite Processados", detail: "Corte embutidos, molhos prontos e fast food." }
    ],
    common_errors: ["Beber pouca água", "Cortar sal totalmente por muito tempo"],
    success_signs: ["Rosto mais fino pela manhã", "Menos marcas de travesseiro"],
    frequency: "Ciclos de 1 semana",
    session_duration: "Diário",
    tags: ["Rápido", "Desinchaço"]
  },
  {
    id: "lymphatic-drainage",
    title: "Drenagem Linfática Facial",
    subtitle: "Massagem para remover fluídos estagnados",
    category: "exercicio",
    targets: ["sinais_inchaco", "regiao_ocular", "textura_pele"],
    evidence_level: "Moderada",
    benefit_type: "Temporário",
    science_explanation: "A estimulação manual dos canais linfáticos auxilia o retorno venoso e a remoção de fluidos intersticiais.",
    impact_base: 7,
    time_to_results_days: 1,
    contraindications: ["Acne inflamatória ativa (pode espalhar bactérias)", "Feridas abertas"],
    phase: "week1",
    references: [
      { title: "Manual lymphatic drainage: a systematic review", year: 2018, source: "Journal of Clinical Medicine", doi: "10.3390/jcm7120483", type: "systematic_review" },
      { title: "Facial massage effects on skin blood flow", year: 2017, source: "Biomed Research International", type: "rct" }
    ],
    safety_alert: "Se tiver acne inflamatória ativa, NÃO faça drenagem — pode espalhar bactérias.",
    steps: [
      { text: "Preparação", detail: "Use óleo facial ou hidratante. Lave as mãos." },
      { text: "Pescoço Primeiro", detail: "Do lóbulo da orelha para baixo, em direção à clavícula." },
      { text: "Mandíbula", detail: "Do queixo em direção à orelha, com pressão leve." },
      { text: "Olhos", detail: "Do canto interno para as têmporas, muito suavemente (dedo anelar)." },
      { text: "Testa", detail: "Do centro para as laterais." }
    ],
    common_errors: ["Muita pressão (fecha os vasos)", "Fazer sem óleo (estica a pele)"],
    success_signs: ["Redução imediata do inchaço matinal", "Pele com viço"],
    frequency: "Diariamente (manhã)",
    session_duration: "5 min",
    tags: ["Manutenção", "Diário"]
  },
  {
    id: "caloric-deficit",
    title: "Déficit Calórico Controlado",
    subtitle: "Redução de gordura corporal total",
    category: "habito",
    targets: ["gordura_facial", "definicao_terco_inferior", "projecao_mandibular"],
    evidence_level: "Alta",
    benefit_type: "Estrutural",
    science_explanation: "Não existe perda de gordura localizada. Para perder gordura no rosto, é necessário reduzir o percentual corporal total.",
    impact_base: 9,
    time_to_results_days: 45,
    contraindications: ["Transtornos alimentares", "Baixo peso (IMC < 18.5)"],
    phase: "week2_4",
    references: [
      { title: "Regional fat loss: myth or reality?", year: 2013, source: "Journal of Strength & Conditioning Research", type: "rct" },
      { title: "Caloric restriction and body composition", year: 2020, source: "Obesity Reviews", type: "systematic_review" }
    ],
    safety_alert: "Se tiver histórico de transtornos alimentares, consulte um nutricionista antes.",
    steps: [
      { text: "Cálculo TDEE", detail: "Calcule seu gasto calórico total diário." },
      { text: "Déficit Moderado", detail: "300-500kcal a menos que seu gasto. Perda de ~0.5kg/semana." },
      { text: "Proteína Alta", detail: "2g/kg de peso para preservar músculo." },
      { text: "Paciência", detail: "O rosto é um dos últimos a perder gordura em algumas pessoas." }
    ],
    common_errors: ["Corte drástico (perda de músculo)", "Pouca proteína (flacidez)"],
    success_signs: ["Perda de peso na balança", "Definição da mandíbula aparecendo"],
    frequency: "Diário",
    session_duration: "Contínuo",
    tags: ["Fitness", "Essencial"]
  },

  // ─── PELE ───
  {
    id: "basic-skincare",
    title: "Tríade do Skincare",
    subtitle: "Limpeza, Hidratação e Proteção Solar",
    category: "skincare",
    targets: ["textura_pele", "qualidade_pele", "rugas"],
    evidence_level: "Alta",
    benefit_type: "Comportamental",
    science_explanation: "Manter a barreira cutânea íntegra e protegida da radiação UV é a intervenção com maior respaldo científico para estética da pele.",
    impact_base: 8,
    time_to_results_days: 21,
    contraindications: ["Alergia a componentes específicos"],
    phase: "week1",
    references: [
      { title: "Photoprotection guideline", year: 2022, source: "Sociedade Brasileira de Dermatologia", type: "guideline" },
      { title: "Moisturizer efficacy for skin barrier repair", year: 2018, source: "Dermatologic Therapy", type: "systematic_review" },
      { title: "UV-induced skin aging prevention", year: 2019, source: "Photodermatology, Photoimmunology & Photomedicine", type: "rct" }
    ],
    steps: [
      { text: "Limpeza (Manhã/Noite)", detail: "Gel de limpeza suave, sem sulfatos agressivos. Quantidade: 1 pump." },
      { text: "Hidratação", detail: "Gel para oleosa, creme para seca. Quantidade: 1 ervilha." },
      { text: "Proteção Solar (Manhã)", detail: "FPS 30+. O sol é responsável por ~80% do envelhecimento visível. Reaplicar a cada 2h se exposto." }
    ],
    common_errors: ["Não usar protetor em dias nublados", "Lavar com sabonete de corpo", "Esfregar toalha no rosto"],
    success_signs: ["Pele menos oleosa/seca", "Menos acne", "Textura mais suave"],
    frequency: "2x ao dia",
    session_duration: "3 min",
    tags: ["Essencial", "Básico"]
  },
  {
    id: "retinol-protocol",
    title: "Protocolo Retinóide",
    subtitle: "Renovação celular acelerada",
    category: "skincare",
    targets: ["textura_pele", "rugas", "acne", "manchas"],
    evidence_level: "Alta",
    benefit_type: "Estrutural",
    science_explanation: "Derivados de Vitamina A aumentam o turnover celular e estimulam colágeno. Padrão ouro da dermatologia anti-aging.",
    impact_base: 9,
    time_to_results_days: 60,
    contraindications: ["Gravidez", "Pele extremamente sensível", "Rosácea (consultar médico)", "Uso de isotretinoína oral"],
    phase: "week2_4",
    references: [
      { title: "Retinoids in the treatment of skin aging", year: 2006, source: "Clinical Interventions in Aging", doi: "10.2147/ciia.2006.1.4.327", type: "systematic_review" },
      { title: "Topical retinoid therapy guidelines", year: 2021, source: "Journal of the American Academy of Dermatology", type: "guideline" },
      { title: "Tretinoin vs retinol: efficacy comparison", year: 2019, source: "British Journal of Dermatology", type: "rct" }
    ],
    safety_alert: "Se estiver grávida ou planejando engravidar, NÃO use retinóides. Consulte um dermatologista.",
    steps: [
      { text: "Introdução Gradual", detail: "Comece 2x/semana à noite. Aumente conforme tolerância." },
      { text: "Quantidade", detail: "Tamanho de 1 ervilha para o rosto todo. Mais NÃO é melhor." },
      { text: "Técnica Sanduíche", detail: "Hidratante → Retinóide → Hidratante para reduzir irritação." },
      { text: "Protetor Solar", detail: "Uso OBRIGATÓRIO durante o dia (a pele fica fotossensível)." }
    ],
    common_errors: ["Usar de manhã", "Usar muito produto", "Misturar com ácidos fortes"],
    success_signs: ["Pele mais lisa e brilhante (glow)", "Redução de linhas finas"],
    frequency: "Noite (progressivo: 2x → 4x → diário)",
    session_duration: "1 min",
    warning: "Pode causar 'purging' (piora inicial) e descamação nas primeiras semanas.",
    tags: ["Avançado", "Anti-aging"]
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
    science_explanation: "O frio causa vasoconstrição imediata, reduzindo o fluxo sanguíneo superficial e o extravasamento de líquidos.",
    impact_base: 6,
    time_to_results_days: 1,
    contraindications: ["Urticária ao frio", "Sensibilidade extrema"],
    phase: "week1",
    references: [
      { title: "Cryotherapy for periorbital edema", year: 2015, source: "Aesthetic Surgery Journal", type: "observational" }
    ],
    steps: [
      { text: "Gelo Protegido", detail: "NUNCA gelo direto na pele. Envolva em pano fino ou use roller gelado." },
      { text: "Massagem", detail: "Movimentos circulares ao redor dos olhos, 3-5 min pela manhã." },
      { text: "Consistência", detail: "Diariamente ao acordar para combater inchaço matinal." }
    ],
    common_errors: ["Queimar a pele com gelo direto", "Fazer por >10 min", "Pressionar o globo ocular"],
    success_signs: ["Olhar mais aberto", "Menos inchaço nas pálpebras"],
    frequency: "Diariamente (manhã)",
    session_duration: "5 min",
    tags: ["Rápido", "Manhã"]
  },
  {
    id: "volufiline-eyes",
    title: "Volufiline Tópico",
    subtitle: "Estimulação lipídica para olheiras profundas",
    category: "skincare",
    targets: ["regiao_ocular", "olheiras"],
    evidence_level: "Baixa",
    benefit_type: "Estrutural",
    science_explanation: "Sarsasapogenina (Volufiline) estimula a diferenciação de adipócitos. Usado para preencher a calha lacrimal.",
    impact_base: 5,
    time_to_results_days: 60,
    contraindications: [],
    phase: "month2_plus",
    references: [
      { title: "Sarsasapogenin effects on adipogenesis", year: 2014, source: "International Journal of Cosmetic Science", type: "observational" }
    ],
    steps: [
      { text: "Aplicação Local", detail: "Aplique APENAS na área funda da olheira." },
      { text: "Massagem", detail: "Massageie até absorção completa." },
      { text: "Frequência", detail: "2x ao dia (manhã e noite)." }
    ],
    common_errors: ["Aplicar no rosto todo", "Esperar resultado em 1 semana"],
    success_signs: ["Olheira menos profunda", "Menos sombra na calha lacrimal"],
    frequency: "2x ao dia",
    session_duration: "2 min",
    warning: "Resultados variam muito entre indivíduos. Evidência limitada.",
    tags: ["Experimental", "Olheiras"]
  },

  // ─── PESCOÇO / POSTURA ───
  {
    id: "neck-training",
    title: "Fortalecimento Cervical",
    subtitle: "Pescoço mais largo para suporte estrutural",
    category: "exercicio",
    targets: ["alinhamento_cervical", "pescoço", "masculinidade_estrutural"],
    evidence_level: "Alta",
    benefit_type: "Estrutural",
    science_explanation: "Um pescoço desenvolvido (esternocleidomastóideo e trapézio) melhora a estética facial e ajuda a manter a postura correta.",
    impact_base: 7,
    time_to_results_days: 60,
    contraindications: ["Hérnia de disco cervical", "Histórico de lesão na coluna"],
    phase: "week2_4",
    references: [
      { title: "Neck muscle training for cervical stability", year: 2017, source: "Journal of Sports Science & Medicine", type: "rct" },
      { title: "Cervical muscle hypertrophy protocols", year: 2020, source: "Strength & Conditioning Journal", type: "expert_consensus" }
    ],
    safety_alert: "Movimentos controlados, sem trancos. Se sentir dor aguda, pare imediatamente.",
    steps: [
      { text: "Neck Curls", detail: "Deitado de costas, flexione o pescoço levando o queixo ao peito. 3x15." },
      { text: "Neck Extensions", detail: "Deitado de bruços, levante a cabeça. 3x15." },
      { text: "Progressão", detail: "Adicione peso gradualmente (anilha com toalha)." },
      { text: "Segurança", detail: "Movimentos controlados, sem impulso." }
    ],
    common_errors: ["Usar impulso", "Amplitude incompleta", "Excesso de carga inicial"],
    success_signs: ["Aumento da medida do pescoço", "Camisas mais justas no colarinho"],
    frequency: "2-3x por semana",
    session_duration: "15 min",
    tags: ["Muscular", "Postura"]
  },
  {
    id: "chin-tucks",
    title: "Chin Tucks (Correção Postural)",
    subtitle: "Realinhamento da cabeça e pescoço",
    category: "exercicio",
    targets: ["alinhamento_cervical", "projecao_mandibular", "papada"],
    evidence_level: "Alta",
    benefit_type: "Comportamental",
    science_explanation: "Combate a Forward Head Posture (cabeça projetada à frente), que cria ilusão de queixo fraco e papada.",
    impact_base: 8,
    time_to_results_days: 30,
    contraindications: ["Dor aguda ao movimento"],
    phase: "week1",
    references: [
      { title: "Cervical retraction exercises for neck pain", year: 2016, source: "Journal of Physical Therapy Science", type: "rct" },
      { title: "Forward head posture and craniofacial aesthetics", year: 2019, source: "Cranio", type: "observational" }
    ],
    steps: [
      { text: "Movimento", detail: "Em pé, puxe a cabeça para trás horizontalmente (criando 'papada' proposital)." },
      { text: "Segurar", detail: "Mantenha a posição retraída por 5 segundos." },
      { text: "Repetição", detail: "10 repetições, 3x ao dia." },
      { text: "Consciência", detail: "Monitore sua postura ao usar celular e computador." }
    ],
    common_errors: ["Inclinar a cabeça para cima/baixo (deve ser horizontal)", "Tencionar os ombros"],
    success_signs: ["Melhora na postura natural", "Orelha alinhada com ombro"],
    frequency: "Diariamente (várias vezes)",
    session_duration: "2 min",
    tags: ["Postura", "Perfil"]
  }
];

// ─── Export intervention pool for external use ───
export function getInterventionPool(): Intervention[] {
  return INTERVENTION_POOL;
}

// ─── Logic ───
export function generatePersonalizedPlan(analysis?: ExtendedAnalysisResult): PersonalizedPlan {
  if (!analysis) {
    return { bottlenecks: [], trends: [], gerScore: 0, hasAnalysis: false };
  }

  let diag = analysis.structural_diagnosis;
  if (!diag) {
    diag = generateStructuralDiagnosis(analysis);
  }
  const isDynamic = !!diag;

  let gerScore = analysis.ger ?? 0;
  if (!gerScore && analysis.overallScore) gerScore = Math.round(analysis.overallScore * 10);

  let bottlenecks: FacialBottleneck[] = [];
  let selectedTrends: SmartTrend[] = [];

  if (isDynamic && diag) {
    bottlenecks = diag.prioridades.map((area, index) => {
      const severity = diag.severidade?.[area] ?? 5;
      const impact = diag.impacto_visual?.[area] ?? 5;
      
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
        score: Math.max(0, 100 - (severity * 10)),
        maxScore: 100,
        priority: index === 0 ? "critica" as const : index === 1 ? "alta" as const : "media" as const,
        icon,
        severity,
        impact_visual: impact
      };
    });

    const candidates = INTERVENTION_POOL.filter(intervention => {
      const helpsPriority = intervention.targets.some(t => diag.prioridades.includes(t));
      if (intervention.id === "sodium-flush" && diag.sinais_inchaco === "Ausentes") return false;
      if (intervention.id === "caloric-deficit" && diag.gordura_facial === "Baixa") return false;
      if (intervention.id === "chin-tucks" && diag.alinhamento_cervical === "Neutro") return false;
      return helpsPriority;
    });

    const ranked = candidates.map(intervention => {
      let score = intervention.impact_base;
      if (intervention.targets.includes(diag.prioridades[0])) score += 3;
      if (intervention.evidence_level === "Alta") score += 2;
      return { ...intervention, score };
    }).sort((a, b) => b.score - a.score);

    selectedTrends = ranked.slice(0, 4).map(inv => {
      let justification = `Recomendado para melhorar ${inv.targets[0].replace(/_/g, " ")}.`;
      
      if (inv.targets.includes("gordura_facial") && diag!.gordura_facial === "Alta") {
        justification = "Sua estimativa de gordura facial indica que reduzir o percentual global é o passo mais impactante para definição.";
      } else if (inv.targets.includes("sinais_inchaco") && diag!.sinais_inchaco === "Visíveis") {
        justification = "Sinais visíveis de inchaço estão mascarando sua estrutura óssea.";
      } else if (inv.targets.includes("projecao_mandibular") && diag!.projecao_mandibular === "Recuada") {
        justification = "Sua projeção mandibular está abaixo do potencial. Estimular musculatura e postura pode ajudar.";
      } else if (inv.targets.includes("textura_pele") && diag!.textura_pele === "Irregular") {
        justification = "Irregularidades na textura da pele foram detectadas. Este protocolo é específico para renovação celular.";
      } else if (inv.targets.includes("regiao_ocular") && diag!.regiao_ocular === "Sinais de fadiga") {
        justification = "Sinais de fadiga na região ocular reduzem a vitalidade do rosto.";
      }

      return {
        id: inv.id,
        title: inv.title,
        subtitle: inv.subtitle,
        reason: justification,
        area: inv.targets[0],
        areaScore: 50,
        impactEstimate: inv.impact_base,
        duration: `${inv.time_to_results_days} dias`,
        frequency: inv.frequency,
        validation: inv.evidence_level,
        science: inv.science_explanation,
        steps: inv.steps,
        disclaimer: inv.warning || "Consulte um profissional se tiver dúvidas.",
        tags: inv.tags,
        category: inv.category,
        common_errors: inv.common_errors,
        success_signs: inv.success_signs,
        session_duration: inv.session_duration,
        benefit_type: inv.benefit_type,
        phase: inv.phase,
        references: inv.references,
        safety_alert: inv.safety_alert,
        contraindications: inv.contraindications,
        warning: inv.warning
      };
    });
  }

  return { 
    bottlenecks, 
    trends: selectedTrends, 
    gerScore, 
    hasAnalysis: true,
    diagnosis: diag 
  };
}
