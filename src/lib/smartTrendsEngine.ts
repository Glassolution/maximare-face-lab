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
    science_explanation: "A pressão constante da língua contra o palato (céu da boca) exerce força expansiva na maxila, prevenindo o colapso do arco dentário e promovendo projeção anterior do terço médio e inferior da face.",
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
      { text: "Posicionamento da Língua", detail: "Encoste TODA a língua no céu da boca, incluindo a parte posterior (raiz). A ponta deve ficar logo atrás dos dentes da frente, sem tocá-los." },
      { text: "Selamento Labial Suave", detail: "Mantenha os lábios fechados sem força excessiva. Os dentes devem estar levemente encostados ou muito próximos, sem apertar." },
      { text: "Respiração Nasal Estrita", detail: "Respire EXCLUSIVAMENTE pelo nariz. Se não conseguir, investigue obstruções nasais." },
      { text: "Deglutição Correta (Cheesy Smile)", detail: "Ao engolir, sorria exageradamente mostrando os dentes e use apenas a língua para empurrar a saliva para a garganta, sem sugar as bochechas." }
    ],
    common_errors: ["Empurrar os dentes da frente com a língua (causa projeção dentária)", "Tencionar a mandíbula/bruxismo", "Esquecer a parte de trás da língua"],
    success_signs: ["Sensação de pressão no palato e nariz", "Respiração nasal mais fácil", "Pele abaixo do queixo mais esticada"],
    frequency: "24 horas por dia (hábito permanente)",
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
    science_explanation: "O músculo masseter, responsável pela mastigação, responde à sobrecarga mecânica aumentando o tamanho das fibras musculares (hipertrofia), o que alarga o terço inferior do rosto.",
    impact_base: 8,
    time_to_results_days: 45,
    contraindications: ["Bruxismo", "Dores na ATM", "Dores de cabeça tensionais"],
    phase: "week2_4",
    references: [
      { title: "Masseter muscle hypertrophy from functional loading", year: 2016, source: "Journal of Oral Rehabilitation", type: "rct" },
      { title: "Effect of chewing exercise on masseter thickness", year: 2019, source: "Cranio", type: "observational" }
    ],
    safety_alert: "Pare imediatamente se sentir estalos ou dor na articulação perto do ouvido.",
    steps: [
      { text: "Seleção do Material", detail: "Use gomas de mascar rígidas (ex: 2-3 unidades juntas ou gomas de mástique). Não use objetos que possam quebrar os dentes." },
      { text: "Técnica de Mastigação", detail: "Mastigue usando os molares (dentes de trás). Faça movimentos lentos e controlados de compressão total." },
      { text: "Simetria Rigorosa", detail: "Cronometre o tempo: mastigue exatamente o mesmo tempo de cada lado (ex: 10 min direita, 10 min esquerda)." },
      { text: "Volume e Descanso", detail: "Realize por 20 minutos totais. Descanse o músculo nos dias seguintes se sentir dor tardia." }
    ],
    common_errors: ["Mastigar rápido demais (pouca tensão mecânica)", "Mastigar mais de um lado (gera assimetria)", "Exceder 30 minutos (risco de DTM)"],
    success_signs: ["Sensação de 'pump' (inchaço muscular) nas laterais do rosto após o treino", "Músculo mais duro ao contrair"],
    frequency: "3 a 4 vezes por semana (dias alternados)",
    session_duration: "20 minutos totais",
    warning: "Excesso pode causar problemas graves na ATM.",
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
    science_explanation: "O excesso de sódio aumenta a osmolaridade do sangue, forçando o corpo a reter água. Reduzir a ingestão libera esse excesso via urina rapidamente.",
    impact_base: 9,
    time_to_results_days: 5,
    contraindications: ["Hipotensão severa (consultar médico)"],
    phase: "week1",
    references: [
      { title: "Dietary sodium and facial edema", year: 2017, source: "American Journal of Hypertension", type: "rct" },
      { title: "Sodium intake and fluid retention", year: 2015, source: "Cochrane Database Syst Rev", doi: "10.1002/14651858", type: "systematic_review" }
    ],
    steps: [
      { text: "Limite de Ingestão", detail: "Consuma no máximo 1500mg de sódio por dia durante o protocolo (leia rótulos: 1g de sal = 400mg de sódio)." },
      { text: "Super-hidratação", detail: "Beba 50ml de água por kg de peso corporal (ex: 70kg = 3.5 litros). A água ajuda a 'lavar' o sódio." },
      { text: "Aporte de Potássio", detail: "Adicione alimentos ricos em potássio (banana, água de coco, batata doce) para equilibrar a bomba sódio-potássio." },
      { text: "Corte Radical", detail: "Zero embutidos, molhos prontos, shoyu, fast food e refrigerantes (mesmo zero) por 7 dias." }
    ],
    common_errors: ["Beber pouca água achando que vai desinchar", "Cortar o sal por tempo indeterminado (perigoso)", "Não contar o sódio oculto em conservas"],
    success_signs: ["Rosto visivelmente mais fino ao acordar", "Anéis e sapatos ficando largos", "Aumento da frequência urinária"],
    frequency: "Ciclos de 7 dias quando necessário",
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
    science_explanation: "A massagem direcionada estimula o sistema linfático a captar o excesso de líquido intersticial e transportá-lo para os linfonodos, onde é filtrado e eliminado.",
    impact_base: 7,
    time_to_results_days: 1,
    contraindications: ["Acne inflamatória ativa (pode espalhar bactérias)", "Feridas abertas"],
    phase: "week1",
    references: [
      { title: "Manual lymphatic drainage: a systematic review", year: 2018, source: "Journal of Clinical Medicine", doi: "10.3390/jcm7120483", type: "systematic_review" },
      { title: "Facial massage effects on skin blood flow", year: 2017, source: "Biomed Research International", type: "rct" }
    ],
    safety_alert: "Se tiver acne com pus ou inflamada, NÃO faça. O atrito pode romper as pústulas e espalhar a infecção.",
    steps: [
      { text: "Preparação da Pele", detail: "Lave o rosto e aplique óleo facial ou hidratante para deslizar. Nunca faça a seco." },
      { text: "Abertura dos Gânglios", detail: "Pressione levemente (pulsando) a região logo acima da clavícula e atrás das orelhas por 10 segundos." },
      { text: "Drenagem do Pescoço", detail: "Deslize as mãos do lóbulo da orelha até a clavícula 10 vezes para liberar o caminho." },
      { text: "Drenagem Facial", detail: "Com pressão LEVE (peso de uma moeda), deslize do centro do rosto para as orelhas. Testa, olhos, bochechas e queixo." }
    ],
    common_errors: ["Usar muita força (colapsa os vasos linfáticos)", "Fazer movimentos de baixo para cima (contra o fluxo)", "Fazer sem lubrificante"],
    success_signs: ["Redução imediata do inchaço nas pálpebras", "Contorno da mandíbula mais nítido", "Sensação de leveza"],
    frequency: "Todos os dias ao acordar",
    session_duration: "5 minutos",
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
    science_explanation: "A gordura facial é armazenada da mesma forma que a corporal. Para reduzi-la, é fisiologicamente necessário que o corpo esteja em balanço energético negativo.",
    impact_base: 9,
    time_to_results_days: 45,
    contraindications: ["Transtornos alimentares", "Baixo peso (IMC < 18.5)"],
    phase: "week2_4",
    references: [
      { title: "Regional fat loss: myth or reality?", year: 2013, source: "Journal of Strength & Conditioning Research", type: "rct" },
      { title: "Caloric restriction and body composition", year: 2020, source: "Obesity Reviews", type: "systematic_review" }
    ],
    safety_alert: "Busque orientação nutricional. Déficits agressivos causam perda muscular e flacidez.",
    steps: [
      { text: "Cálculo de TDEE", detail: "Descubra seu Gasto Energético Total Diário (use calculadoras online de TDEE)." },
      { text: "Déficit Inteligente", detail: "Subtraia 300 a 500 calorias do seu TDEE. Isso gera uma perda saudável de 0.3 a 0.5kg por semana." },
      { text: "Aporte Proteico", detail: "Consuma 1.6g a 2.0g de proteína por kg de peso para garantir que a perda seja de gordura, não músculo." },
      { text: "Monitoramento", detail: "Pese-se diariamente e tire a média semanal. Ajuste as calorias se o peso estagnar por 2 semanas." }
    ],
    common_errors: ["Cortar calorias demais (metabolismo desacelera)", "Não comer proteína suficiente (rosto fica flácido/cadaverico)", "Desistir antes de 8 semanas"],
    success_signs: ["Roupas ficando mais largas", "Linha da mandíbula começando a aparecer", "Sombra abaixo das maçãs do rosto"],
    frequency: "Diariamente (consistência)",
    session_duration: "Contínuo (até atingir o objetivo)",
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
    science_explanation: "A limpeza remove poluentes oxidativos, a hidratação mantém a barreira cutânea funcional e o protetor impede o dano ao DNA celular causado pela radiação UV.",
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
      { text: "Limpeza (2x ao dia)", detail: "Use um gel de limpeza facial (não sabonete de corpo). Lave ao acordar e antes de dormir. Seque com toalha limpa, apenas encostando." },
      { text: "Hidratação (2x ao dia)", detail: "Aplique logo após lavar, com a pele levemente úmida. Gel-creme para peles oleosas, creme denso para secas." },
      { text: "Proteção Solar (Manhã)", detail: "Aplique a regra dos 3 dedos (indicador, médio e anelar) para cobrir rosto e pescoço. Use FPS 30 ou superior diariamente." }
    ],
    common_errors: ["Não usar protetor em casa ou dias nublados", "Lavar o rosto muitas vezes (efeito rebote de oleosidade)", "Esquecer o pescoço"],
    success_signs: ["Pele com toque macio e não repuxando", "Redução de cravos superficiais", "Tom de pele mais uniforme"],
    frequency: "Todos os dias, manhã e noite",
    session_duration: "3 minutos",
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
    science_explanation: "Retinóides se ligam a receptores nucleares nas células da pele, acelerando a renovação celular e estimulando fibroblastos a produzir colágeno novo.",
    impact_base: 9,
    time_to_results_days: 60,
    contraindications: ["Gravidez", "Pele extremamente sensível", "Rosácea (consultar médico)", "Uso de isotretinoína oral"],
    phase: "week2_4",
    references: [
      { title: "Retinoids in the treatment of skin aging", year: 2006, source: "Clinical Interventions in Aging", doi: "10.2147/ciia.2006.1.4.327", type: "systematic_review" },
      { title: "Topical retinoid therapy guidelines", year: 2021, source: "Journal of the American Academy of Dermatology", type: "guideline" },
      { title: "Tretinoin vs retinol: efficacy comparison", year: 2019, source: "British Journal of Dermatology", type: "rct" }
    ],
    safety_alert: "Proibido na gravidez. Uso noturno obrigatório. Protetor solar indispensável durante o dia.",
    steps: [
      { text: "Apenas à Noite", detail: "A luz solar degrada o retinol e a pele fica sensível. Aplique sempre antes de dormir." },
      { text: "Pele Seca", detail: "Espere 20 minutos após lavar o rosto para aplicar. Aplicar em pele úmida aumenta a absorção e a irritação." },
      { text: "Quantidade Mínima", detail: "Use o tamanho de uma ervilha para o rosto todo. Espalhe em 5 pontos (testa, bochechas, nariz, queixo) e conecte." },
      { text: "Frequência Escalonada", detail: "Semana 1-2: 2 noites/semana. Semana 3-4: Dias alternados. Mês 2+: Todas as noites se tolerar." }
    ],
    common_errors: ["Usar de manhã", "Aplicar muito produto achando que vai agir mais rápido", "Não hidratar (causa descamação)"],
    success_signs: ["'Retinol Glow' (pele brilhante e esticada)", "Poros parecendo menores", "Manchas clareando"],
    frequency: "Apenas à noite (progressivo)",
    session_duration: "1 minuto",
    warning: "Pode ocorrer 'purging' (piora da acne) e descamação nas primeiras 2-4 semanas.",
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
    science_explanation: "A baixa temperatura provoca constrição imediata dos vasos sanguíneos dilatados e reduz a permeabilidade vascular, diminuindo o extravasamento de líquidos.",
    impact_base: 6,
    time_to_results_days: 1,
    contraindications: ["Urticária ao frio", "Sensibilidade extrema"],
    phase: "week1",
    references: [
      { title: "Cryotherapy for periorbital edema", year: 2015, source: "Aesthetic Surgery Journal", type: "observational" }
    ],
    steps: [
      { text: "Proteção Térmica", detail: "Envolva o cubo de gelo em um tecido fino ou gaze molhada. Nunca aplique gelo diretamente na pele fina dos olhos." },
      { text: "Movimento Drenante", detail: "Deslize do canto interno (perto do nariz) para o externo (têmporas). Não esfregue, deslize." },
      { text: "Tempo Limite", detail: "Faça por 2 a 3 minutos em cada olho. Mais que isso pode causar efeito rebote (vasodilatação)." },
      { text: "Timing", detail: "Realize imediatamente após acordar para combater o edema postural do sono." }
    ],
    common_errors: ["Queimar a pele com gelo direto", "Ficar parado no mesmo ponto", "Pressionar contra o globo ocular"],
    success_signs: ["Olhar mais 'acordado'", "Pálpebras menos pesadas", "Redução temporária da coloração arroxeada"],
    frequency: "Todas as manhãs",
    session_duration: "5 minutos",
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
    science_explanation: "A sarsasapogenina (ativo do Volufiline) estimula a proliferação e diferenciação de adipócitos, teoricamente aumentando o volume de gordura local.",
    impact_base: 5,
    time_to_results_days: 60,
    contraindications: [],
    phase: "month2_plus",
    references: [
      { title: "Sarsasapogenin effects on adipogenesis", year: 2014, source: "International Journal of Cosmetic Science", type: "observational" }
    ],
    steps: [
      { text: "Aplicação de Precisão", detail: "Use um pincel fino ou a ponta do dedo mínimo. Aplique EXATAMENTE sobre a área funda (calha lacrimal)." },
      { text: "Quantidade Ínfima", detail: "Uma gota é suficiente para ambos os olhos. O excesso pode migrar para áreas indesejadas." },
      { text: "Massagem Local", detail: "Dê leves batidinhas para absorção, sem espalhar para as bochechas ou pálpebra superior." },
      { text: "Consistência", detail: "Use duas vezes ao dia (manhã e noite) sem falhar." }
    ],
    common_errors: ["Aplicar no rosto todo (pode inchar o rosto)", "Esperar resultados rápidos (demora meses)", "Usar produto de baixa concentração"],
    success_signs: ["Suavização da profundidade da olheira", "Menos sombra na região infraorbital"],
    frequency: "2x ao dia",
    session_duration: "2 minutos",
    warning: "Resultados variam muito. Se notar inchaço excessivo, suspenda.",
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
    science_explanation: "A hipertrofia dos músculos esternocleidomastóideo e trapézio aumenta a circunferência do pescoço, melhorando a proporção facial e a estabilidade da cabeça.",
    impact_base: 7,
    time_to_results_days: 60,
    contraindications: ["Hérnia de disco cervical", "Histórico de lesão na coluna", "Dor crônica no pescoço"],
    phase: "week2_4",
    references: [
      { title: "Neck muscle training for cervical stability", year: 2017, source: "Journal of Sports Science & Medicine", type: "rct" },
      { title: "Cervical muscle hypertrophy protocols", year: 2020, source: "Strength & Conditioning Journal", type: "expert_consensus" }
    ],
    safety_alert: "O pescoço é sensível. Nunca faça movimentos bruscos ou explosivos. Se sentir tontura ou dor aguda, pare.",
    steps: [
      { text: "Aquecimento", detail: "Faça movimentos leves de 'sim' e 'não' com a cabeça por 1 minuto antes de começar." },
      { text: "Neck Curls (Flexão)", detail: "Deitado de costas na cama com a cabeça para fora. Leve o queixo ao peito controladamente. 3 séries de 15 reps." },
      { text: "Neck Extensions (Extensão)", detail: "Deitado de bruços com a cabeça para fora. Olhe para cima levantando a nuca. 3 séries de 15 reps." },
      { text: "Progressão de Carga", detail: "Comece apenas com o peso da cabeça. Após 2 semanas, segure um prato leve ou toalha na testa/nuca." }
    ],
    common_errors: ["Usar impulso do corpo", "Amplitude incompleta", "Prender a respiração (pode desmaiar)"],
    success_signs: ["Colarinhos de camisa ficando apertados", "Sensação de estabilidade na cabeça", "Melhora visual de perfil"],
    frequency: "2 a 3 vezes por semana (nunca dias seguidos)",
    session_duration: "15 minutos",
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
    science_explanation: "Fortalece os flexores profundos do pescoço e alonga os extensores curtos, corrigindo a anteriorização da cabeça (Forward Head Posture).",
    impact_base: 8,
    time_to_results_days: 30,
    contraindications: ["Dor aguda ao movimento"],
    phase: "week1",
    references: [
      { title: "Cervical retraction exercises for neck pain", year: 2016, source: "Journal of Physical Therapy Science", type: "rct" },
      { title: "Forward head posture and craniofacial aesthetics", year: 2019, source: "Cranio", type: "observational" }
    ],
    steps: [
      { text: "Posição Inicial", detail: "Fique em pé ou sentado com a coluna reta. Olhe para o horizonte." },
      { text: "Retração", detail: "Sem inclinar a cabeça para cima ou para baixo, deslize o queixo para trás horizontalmente, como se quisesse fazer papada dupla." },
      { text: "Isometria", detail: "Segure a posição retraída (sentindo alongar a nuca) por 5 segundos." },
      { text: "Volume", detail: "Faça 10 repetições a cada 2-3 horas, especialmente se trabalha no computador." }
    ],
    common_errors: ["Olhar para baixo ao retrair", "Levantar os ombros", "Prender a respiração"],
    success_signs: ["Orelha alinhada com o ombro em fotos de perfil", "Menos tensão no trapézio", "Redução da 'corcunda' cervical"],
    frequency: "Várias vezes ao dia (micro-pausas)",
    session_duration: "2 minutos",
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
