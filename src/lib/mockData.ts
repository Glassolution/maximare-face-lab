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
    { id: "symmetry", name: "Simetria Facial", score: +(6 + Math.random() * 3).toFixed(1), icon: "Scan" },
    { id: "jawline", name: "Estrutura Óssea", score: +(5.5 + Math.random() * 3.5).toFixed(1), icon: "Diamond" },
    { id: "harmony", name: "Harmonia Facial", score: +(6 + Math.random() * 3).toFixed(1), icon: "Sparkles" },
    { id: "skin", name: "Qualidade da Pele", score: +(5 + Math.random() * 4).toFixed(1), icon: "Droplets" },
    { id: "hairline", name: "Cabelo & Styling", score: +(5 + Math.random() * 4).toFixed(1), icon: "Scissors" },
    { id: "eyes", name: "Área dos Olhos", score: +(6 + Math.random() * 3).toFixed(1), icon: "Eye" },
    { id: "breathing", name: "Respiração", score: +(5 + Math.random() * 4).toFixed(1), icon: "Lungs" },
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
  // If we are logged in, we trust syncHistoryWithSupabase to have updated this
  // BUT if we just switched accounts, this might still hold the old user's data until sync finishes
  // A better approach is to namespace this by user_id, but for now we rely on the sync to overwrite it.
  
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

export function clearLocalHistory() {
    localStorage.removeItem("maximare_history");
}

export async function deleteAnalysis(id: string): Promise<{ ok: boolean; deleted: number; status: number; error?: string }> {
  try {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session ?? null;
    }
    if (!session?.access_token) return { ok: false, deleted: 0, status: 401, error: "no_session_token" };
    // 1) Tentar via fetch direto para capturar body em 5xx
    const baseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
    const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
    if (baseUrl) {
      try {
        const res = await fetch(`${baseUrl}/functions/v1/delete-analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "sb-access-token": session.access_token,
            "Authorization": `Bearer ${anon}`,
            "apikey": anon
          },
          body: JSON.stringify({ analysis_id: id })
        });
        let body: any = null;
        let text = "";
        try { body = await res.clone().json(); } catch { text = await res.text().catch(() => ""); }
        const ok = !!body?.ok && res.ok;
        const deleted = Number(body?.deleted || 0);
        if (ok && deleted > 0) {
          // Atualiza cache local
          const history = getAnalysisHistory();
          const filtered = history.filter((item) => item.id !== id);
          try {
            if (filtered.length === 0) localStorage.removeItem("maximare_history");
            else localStorage.setItem("maximare_history", JSON.stringify(filtered));
          } catch {}
          return { ok: true, deleted, status: res.status };
        }
        // Se não foi ok, continua para fallback RLS
        if (!ok) {
          return await deleteAnalysisRlsFallback(id, session.access_token, res.status, body?.error || text || "edge_failed");
        }
      } catch (e: any) {
        // Continua para invoke/rls
      }
    }
    // 2) Tentar via functions.invoke (fallback)
    const { data, error, status } = await supabase.functions.invoke('delete-analysis', {
      headers: {
        'sb-access-token': session.access_token,
        'Authorization': `Bearer ${anon}`,
        'apikey': anon
      },
      body: { analysis_id: id }
    });
    if (error) return await deleteAnalysisRlsFallback(id, session.access_token, status || 500, error.message || "invoke_failed");
    if (!data?.ok || (typeof data?.deleted === 'number' && data.deleted <= 0)) {
      // Fallback: tentar deletar diretamente via RLS (token do usuário)
      return await deleteAnalysisRlsFallback(id, session.access_token, status || 200, data?.error || "not_deleted");
    }
  } catch {
    return { ok: false, deleted: 0, status: 500, error: "exception" };
  }

  const history = getAnalysisHistory();
  const filtered = history.filter((item) => item.id !== id);
  try {
    if (filtered.length === 0) {
      localStorage.removeItem("maximare_history");
    } else {
      localStorage.setItem("maximare_history", JSON.stringify(filtered));
    }
  } catch {}
  return { ok: true, deleted: 1, status: 200 };
}

async function deleteAnalysisRlsFallback(id: string, userJwt: string, prevStatus: number, prevError?: string): Promise<{ ok: boolean; deleted: number; status: number; error?: string }> {
  try {
    // Usa o cliente atual (já autenticado) — RLS aplica auth.jwt do usuário
    let total = 0;
    const delHist = await supabase.from('analysis_history').delete({ count: 'exact' }).filter('result_json->>id', 'eq', id);
    total += delHist.count || 0;
    if (total === 0) {
      const delFace = await supabase.from('face_analysis_events').delete({ count: 'exact' }).filter('result_json->>id', 'eq', id);
      total += delFace.count || 0;
    }
    if (total > 0) {
      const history = getAnalysisHistory();
      const filtered = history.filter((item) => item.id !== id);
      try {
        if (filtered.length === 0) {
          localStorage.removeItem("maximare_history");
        } else {
          localStorage.setItem("maximare_history", JSON.stringify(filtered));
        }
      } catch {}
      return { ok: true, deleted: total, status: 200 };
    }
    return { ok: false, deleted: 0, status: prevStatus, error: prevError || delHist?.error?.message || "rls_not_deleted" };
  } catch (e: any) {
    return { ok: false, deleted: 0, status: prevStatus, error: e?.message || "rls_fallback_error" };
  }
}

import { supabase } from "@/integrations/supabase/client";

export async function saveAnalysis(analysis: AnalysisResult) {
  type StoredAnalysis = AnalysisResult & {
    ger?: number;
    tier?: string;
    badge?: string;
    photoUrl?: string | null;
    secondaryScore?: number;
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
    technicalBreakdown?: {
      asymmetry: string;
      thirds: string;
      jawline: string;
      cheekbones: string;
      eyes: string;
      nose: string;
      fwhr: string;
      breathing: string;
    };
    pslScore?: number;
    jawType?: string;
    mindset?: string;
    strategy?: string;
    breathing?: string;
    appealLevel?: string;
  };

  const extended = analysis as StoredAnalysis;

  const entry: StoredAnalysis = {
    id: analysis.id,
    date: analysis.date,
    overallScore: analysis.overallScore,
    categories: analysis.categories,
    ger: extended.ger,
    tier: extended.tier,
    badge: extended.badge,
    photoUrl: extended.photoUrl ?? null,
    secondaryScore: extended.secondaryScore,
    structural_diagnosis: extended.structural_diagnosis,
    technicalBreakdown: extended.technicalBreakdown,
    pslScore: extended.pslScore,
    jawType: extended.jawType,
    mindset: extended.mindset,
    strategy: extended.strategy,
    breathing: extended.breathing,
    appealLevel: extended.appealLevel,
  };

  // 1. Tentar salvar no Supabase se houver usuário
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { error } = await supabase.from('analysis_history').insert({
        user_id: session.user.id,
        result_json: entry,
        source: 'web'
      });
      
      if (error) {
        console.error("Erro ao salvar no Supabase:", error);
        // Não lançar erro para não interromper o fluxo, mas logar
      }
    }
  } catch (err) {
    console.error("Erro de conexão com Supabase:", err);
  }

  // 2. Salvar no LocalStorage (como cache/fallback)
  const history = getAnalysisHistory() as StoredAnalysis[];
  const newHistory = [entry, ...history].slice(0, 20);

  try {
    localStorage.setItem("maximare_history", JSON.stringify(newHistory));
  } catch (e) {
    console.error("Erro ao salvar no LocalStorage (quota excedida?):", e);
    // Tentar salvar menos itens se falhar
    try {
      const trimmed = newHistory.slice(0, 5);
      localStorage.setItem("maximare_history", JSON.stringify(trimmed));
    } catch (e2) {
      console.error("Falha crítica ao salvar no LocalStorage. Dados não persistidos localmente.", e2);
      // NUNCA apagar o histórico existente em caso de erro!
    }
  }
}

export async function syncHistoryWithSupabase(): Promise<AnalysisResult[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        // If no user logged in, return empty array to clear previous user's data from UI
        // But do NOT clear local storage yet to avoid losing guest data if that was the intent
        // Actually, if we switch accounts, we want to clear the previous user's data from view.
        return [];
    }

    // 1. Fetch data strictly for the CURRENT user
    const { data, error } = await supabase
      .from('analysis_history')
      .select('result_json')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (data) {
      const remoteHistory = data.map(d => d.result_json) as AnalysisResult[];
      
      // Overwrite local storage with this user's data
      // This ensures that when we switch accounts, 'getAnalysisHistory' returns the correct data
      try {
        localStorage.setItem("maximare_history", JSON.stringify(remoteHistory));
      } catch (e) {
        console.warn("Não foi possível salvar histórico no cache local (quota):", e);
      }
      return remoteHistory;
    }
    return [];
  } catch (err) {
    console.error("Erro ao sincronizar histórico:", err);
    return [];
  }
}
