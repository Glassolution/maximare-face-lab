import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISABLE_LIMITS = Deno.env.get("DISABLE_LIMITS") === "1";

const TIERS = [
  { min: 0, max: 39, name: "sub3" },
  { min: 40, max: 54, name: "sub5" },
  { min: 55, max: 64, name: "ltn" },
  { min: 65, max: 72, name: "mtn" },
  { min: 73, max: 79, name: "htn" },
  { min: 80, max: 84, name: "chadlite" },
  { min: 85, max: 89, name: "chad" },
  { min: 90, max: 99, name: "true adam" },
];

const COOLDOWN_SECONDS = 15;

function getTier(ger: number) {
  return TIERS.find((t) => ger >= t.min && ger <= t.max) || TIERS[0];
}

function getNextTier(ger: number) {
  const current = getTier(ger);
  const idx = TIERS.indexOf(current);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

function isoDateOnly(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextMidnightUTC() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.toISOString();
}

function logEvent(event: Record<string, unknown>) {
  console.log("[analyze-face]", JSON.stringify(event));
}

const ROLLING_LIMIT = Number(Deno.env.get("LOVABLE_ROLLING_LIMIT") || "3");
async function rollingGuard(
  supabase: SupabaseClient | null,
  user_id: string | null,
): Promise<{ allowed: boolean; attempts_remaining: number; reset_in_seconds: number }> {
  if (!supabase || !user_id) {
    return { allowed: true, attempts_remaining: ROLLING_LIMIT, reset_in_seconds: 0 };
  }
  const now = new Date();
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data } = await supabase
      .from("analysis_history")
      .select("created_at")
      .eq("user_id", user_id)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true });
    const attempts = Array.isArray(data) ? data.length : 0;
    if (attempts < ROLLING_LIMIT) {
      return { allowed: true, attempts_remaining: ROLLING_LIMIT - attempts, reset_in_seconds: 0 };
    }
    const firstCreated = Array.isArray(data) && data.length > 0 ? data[0].created_at : null;
    const firstMs = firstCreated ? Date.parse(firstCreated) : now.getTime();
    const resetAtMs = firstMs + 24 * 60 * 60 * 1000;
    const resetIn = Math.max(0, Math.ceil((resetAtMs - now.getTime()) / 1000));
    return { allowed: false, attempts_remaining: 0, reset_in_seconds: resetIn };
  } catch {
    // On error, be permissive
    return { allowed: true, attempts_remaining: ROLLING_LIMIT, reset_in_seconds: 0 };
  }
}

type CanAnalyzeOk = {
  ok: true;
  isPremium: boolean;
  remaining: number | null;
  limit: number | null;
  limitsDisabled?: boolean;
};

type CanAnalyzeErrorBody = {
  status: "error";
  error_code: "RATE_LIMIT" | "QUOTA_EXCEEDED";
  message: string;
  retry_after_seconds?: number;
  limit?: number;
  remaining?: number;
  reset_at?: string;
  reset_in_seconds?: number;
};

type CanAnalyzeError = {
  ok: false;
  status: number;
  body: CanAnalyzeErrorBody;
};

async function canAnalyze(
  supabase: any,
  user_id: string | null,
  planHint: "free" | "premium",
): Promise<CanAnalyzeOk | CanAnalyzeError> {
  // BYPASS: skip ALL limit checks when disabled
  if (DISABLE_LIMITS) {
    return { ok: true, isPremium: true, remaining: null, limit: null, limitsDisabled: true };
  }
  if (!supabase || !user_id) {
    return { ok: true, isPremium: false, remaining: null, limit: null };
  }

  const now = new Date();
  const today = isoDateOnly(now);
  const nowMs = now.getTime();

  let isPremium = planHint === "premium";
  let plan = planHint;
  let premiumUntil: string | null = null;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, plan, premium_until")
      .eq("user_id", user_id)
      .maybeSingle();
    if (profile) {
      isPremium = !!profile.is_premium;
      if (profile.plan) plan = profile.plan.toLowerCase() === "premium" ? "premium" : "free";
      premiumUntil = profile.premium_until || null;
    }
  } catch (err) {
    logEvent({ type: "profiles_fetch_error", error: String(err) });
  }

  const premiumActive =
    isPremium ||
    plan === "premium" ||
    (premiumUntil && Date.parse(premiumUntil) > nowMs);

  // Cooldown using last analysis timestamp
  try {
    const { data: lastAnalysis } = await supabase
      .from("analysis_history")
      .select("created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastAnalysis?.created_at) {
      const lastMs = Date.parse(lastAnalysis.created_at);
      const diffSeconds = Math.max(0, Math.floor((nowMs - lastMs) / 1000));
      if (diffSeconds < COOLDOWN_SECONDS) {
        return {
          ok: false,
          status: 429,
          body: {
            status: "error",
            error_code: "RATE_LIMIT",
            message: "Aguarde alguns segundos para uma nova análise.",
            retry_after_seconds: COOLDOWN_SECONDS - diffSeconds,
          },
        };
      }
    }
  } catch (err) {
    logEvent({ type: "analysis_history_fetch_error", error: String(err) });
  }

  const FAIR_USE_PREMIUM_LIMIT = 200;

  if (premiumActive) {
    try {
      const { data, error } = await supabase
        .from("usage_limits")
        .select("scans_used, scans_limit")
        .eq("user_id", user_id)
        .eq("date", today)
        .maybeSingle();
      let scansLimit = FAIR_USE_PREMIUM_LIMIT;
      let scansUsed = 0;
      if (!error && data) {
        scansLimit = data.scans_limit ?? scansLimit;
        scansUsed = data.scans_used ?? 0;
      }
      if (scansUsed >= scansLimit) {
        return {
          ok: false,
          status: 429,
          body: {
            status: "error",
            error_code: "RATE_LIMIT",
            message: "Aguarde alguns segundos para uma nova análise.",
            retry_after_seconds: COOLDOWN_SECONDS,
          },
        };
      }
      const nextUsed = scansUsed + 1;
      await supabase
        .from("usage_limits")
        .upsert({
          user_id,
          date: today,
          scans_used: nextUsed,
          scans_limit: scansLimit,
          reset_at: nextMidnightUTC(),
        });
    } catch (err) {
      logEvent({ type: "usage_limits_premium_error", error: String(err) });
    }

    return { ok: true, isPremium: true, remaining: null, limit: null };
  }

  try {
    const guard = await rollingGuard(supabase, user_id);
    if (!guard.allowed) {
      const resetAt = new Date(Date.now() + guard.reset_in_seconds * 1000).toISOString();
      return {
        ok: false,
        status: 402,
        body: {
          status: "error",
          error_code: "QUOTA_EXCEEDED",
          message: "Você atingiu o limite de análises nas últimas 24h.",
          limit: ROLLING_LIMIT,
          remaining: 0,
          reset_at: resetAt,
          reset_in_seconds: guard.reset_in_seconds,
        },
      };
    }
    return {
      ok: true,
      isPremium: false,
      remaining: guard.attempts_remaining,
      limit: ROLLING_LIMIT,
    };
  } catch (err) {
    logEvent({ type: "rolling_guard_error", error: String(err) });
    return {
      ok: true,
      isPremium: false,
      remaining: null,
      limit: ROLLING_LIMIT,
    };
  }
}

async function getGuardInfo(
  supabase: any,
  user_id: string | null,
  planHint: "free" | "premium",
): Promise<{ isPremium: boolean; remaining: number | null; limit: number | null; limitsDisabled?: boolean }> {
  if (DISABLE_LIMITS) return { isPremium: true, remaining: null, limit: null, limitsDisabled: true };
  if (!supabase || !user_id) return { isPremium: false, remaining: null, limit: null };

  let isPremium = planHint === "premium";
  let plan = planHint;
  let premiumUntil: string | null = null;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, plan, premium_until")
      .eq("user_id", user_id)
      .maybeSingle();
    if (profile) {
      isPremium = !!profile.is_premium;
      if (profile.plan) plan = profile.plan.toLowerCase() === "premium" ? "premium" : "free";
      premiumUntil = profile.premium_until || null;
    }
  } catch {
    // silent
  }

  const premiumActive =
    isPremium ||
    plan === "premium" ||
    (premiumUntil && Date.parse(premiumUntil) > Date.now());

  if (premiumActive) {
    return { isPremium: true, remaining: null, limit: null };
  }

  try {
    const guard = await rollingGuard(supabase, user_id);
    return {
      isPremium: false,
      remaining: guard.attempts_remaining,
      limit: ROLLING_LIMIT,
    };
  } catch {
    return { isPremium: false, remaining: null, limit: ROLLING_LIMIT };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const frontalImage = body.frontalImage;
    const lateralImage = body.lateralImage;
    const analysisId: string = body.analysisId || crypto.randomUUID();
    const checkOnly = body.checkOnly === true;

    if (checkOnly) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      let user_id: string | null = null;
      if (supabase && jwt) {
        try {
          const { data } = await supabase.auth.getUser(jwt);
          user_id = data.user?.id ?? null;
        } catch {
          // ignore
        }
      }
      if (DISABLE_LIMITS) {
        return new Response(JSON.stringify({ allowed: true, attempts_remaining: null, reset_in_seconds: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const guard = await rollingGuard(supabase, user_id);
      return new Response(JSON.stringify(guard), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!frontalImage) {
      return new Response(JSON.stringify({ error: "Foto frontal é obrigatória." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPartial = !lateralImage;
    const limitsDisabled = DISABLE_LIMITS;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase: any = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

    // Identify user and ip
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    let user_id: string | null = null;
    let plan: "free" | "premium" = limitsDisabled ? "premium" : "free";
    if (supabase && jwt) {
      try {
        const { data } = await supabase.auth.getUser(jwt);
        user_id = data.user?.id ?? null;
        if (!limitsDisabled) {
          const meta = (data.user?.user_metadata || data.user?.app_metadata || {}) as Record<string, unknown>;
          const planMeta = (meta["plan"] as string) || (meta["subscription"] as string) || "";
          if (planMeta.toLowerCase() === "premium") plan = "premium";
        }
      } catch (err) {
        logEvent({ type: "auth_error", error: String(err) });
      }
    }
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const safeInsertLog = async (payload: Record<string, unknown>) => {
      if (!supabase) return;
      try {
        await supabase.from("ia_logs").insert({
          created_at: new Date().toISOString(),
          user_id,
          ip,
          ...payload,
        });
      } catch (err) {
        logEvent({ type: "ia_logs_insert_error", error: String(err) });
      }
    };

    // Cache-Hit short-circuit
    if (supabase && user_id && analysisId) {
      try {
        const { data: existing } = await supabase
          .from("analysis_history")
          .select("id, created_at, result_json, user_id")
          .eq("user_id", user_id)
          .eq("analysis_id", analysisId)
          .maybeSingle();
        if (existing?.id) {
          const guardRo = await getGuardInfo(supabase, user_id, plan);
          const responseBody = {
            ...existing.result_json,
            remaining: guardRo.isPremium ? null : guardRo.remaining,
            limit: guardRo.isPremium ? null : guardRo.limit,
            is_premium: guardRo.isPremium,
            limits_disabled: limitsDisabled,
            history_id: existing.id,
            created_at: existing.created_at,
            cooldown_seconds: limitsDisabled ? 0 : COOLDOWN_SECONDS,
          };
          return new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: otherUser } = await supabase
          .from("analysis_history")
          .select("user_id")
          .eq("analysis_id", analysisId)
          .maybeSingle();
        if (otherUser?.user_id && otherUser.user_id !== user_id) {
          return new Response(JSON.stringify({ status: "error", error_code: "NOT_FOUND" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {
        // proceed with normal flow
      }
    }

    let guardInfo: { isPremium: boolean; remaining: number | null; limit: number | null } = {
      isPremium: limitsDisabled,
      remaining: null,
      limit: null,
    };
    if (!limitsDisabled && supabase && user_id) {
      const guard = await canAnalyze(supabase, user_id, plan);
      if (!guard.ok) {
        const errorGuard = guard as CanAnalyzeError;
        const body = errorGuard.body;
        if (body.error_code === "RATE_LIMIT") {
          await safeInsertLog({
            event_type: "rate_limit",
            retry_after: body.retry_after_seconds ?? null,
          });
        }
        if (body.error_code === "QUOTA_EXCEEDED") {
          await safeInsertLog({
            event_type: "quota_exceeded",
            limit: body.limit ?? null,
            used: body.limit && body.remaining != null ? body.limit - body.remaining : null,
            reset_at: body.reset_at ?? null,
          });
        }
        return new Response(JSON.stringify(body), {
          status: errorGuard.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      guardInfo = {
        isPremium: guard.isPremium,
        remaining: guard.remaining,
        limit: guard.limit,
      };
    }

    const imageContents: Array<{ type: string; image_url?: { url: string }; text?: string }> = [];

    imageContents.push({
      type: "text",
      text: `Você é um avaliador técnico de estética facial e looksmaxxing (nível "auditável"), com foco em análise objetiva por foto.
Você deve analisar uma foto frontal e, se disponível, uma foto lateral do mesmo rosto.
Sua saída DEVE ser apenas JSON válido, sem markdown, sem texto extra.

Regras de qualidade e validade (obrigatórias):
- Se não houver rosto humano claro, retorne isValidFace=false.
- Se a foto estiver muito escura, borrada, cortada, com rosto pequeno, filtro pesado, ângulo extremo, expressão exagerada, boca aberta demais, língua pra fora, careta, ou iluminação que distorce contornos (luz lateral dura), marque isPartial=true e reduza confidence (0–1).
- Se a foto lateral não existir ou for inválida, retorne lateral.available=false e preencha scores laterais com null (não invente).
- Não diagnostique saúde. Quando avaliar "inchaço"/"acima do peso", trate como facial adiposity/puffiness aparente.
- Use escala 0–99 para scores (quanto maior, melhor), e inclua confidence geral (0.0–1.0).

${isPartial ? "Apenas uma foto FRONTAL foi fornecida. Marque lateral.available=false e todos os scores laterais como null." : "Fotos FRONTAL e LATERAL foram fornecidas. Analise todos os atributos com precisão total."}

O que avaliar (Scores Numéricos 0-99):

FRONTAL:
- simetria: alinhamento e equivalência dos lados
- proporcao_tercos: terços faciais, harmonia vertical
- largura_zigomatica: maçãs/zigomáticos vs mandíbula
- masculinidade_estrutural: robustez óssea aparente (mandíbula/zigoma/sobrancelha)
- harmonia_nariz: proporção/posição
- linha_cabelo: hairline/temporal (sem suposições se coberto)
- olheiras: olheira/sombra infraorbital (maior score = menos olheira)
- qualidade_pele: uniformidade, textura, manchas aparentes
- rugas: linhas/rugas (maior score = menos rugas)
- definicao_facial: quão "defined" o rosto está — jawline aparente, pouca retenção, contorno nítido
- puffiness_adiposidade_facial: quanto menos inchaço/adiposidade aparente, maior o score
- respiracao_nasal: sinais de respiração nasal correta (lábios selados, desenvolvimento maxilar) vs respirador bucal (face longa, olheiras, lábios abertos). Maior score = Melhor respiração.
- harmonia_geral: equilíbrio global das proporções, terços e quintos faciais.

LATERAL (se disponível):
- projecao_queixo
- definicao_mandibula
- angulo_goniaco
- projecao_maxilar
- harmonia_perfil

DIAGNÓSTICO ESTRUTURAL (Obrigatório):
Gere uma avaliação categórica e técnica para alimentar o motor de recomendações.
Campos obrigatórios:
- projecao_mandibular: "Recuada" | "Neutra" | "Projetada"
- alinhamento_cervical: "Forward Posture" | "Neutro" | "Tenso"
- definicao_terco_inferior: "Baixa" | "Média" | "Alta"
- gordura_facial: "Baixa" | "Média" | "Alta"
- simetria_estrutural: "Baixa" | "Média" | "Alta"
- textura_pele: "Irregular" | "Média" | "Uniforme"
- regiao_ocular: "Cansada/Escura" | "Neutra" | "Vibrante"
- sinais_inchaco: "Ausentes" | "Leves" | "Visíveis"
- prioridades: Array com 3 áreas prioritárias para intervenção (ex: ["mandibula", "pele", "olhos"])
- severidade: Objeto com a severidade (0-10) para cada área prioritária.
- impacto_visual: Objeto com o impacto visual estimado (0-10) se a área for corrigida.

Retorne APENAS este JSON (sem markdown):
{
  "isValidFace": true,
  "isPartial": ${isPartial},
  "confidence": 0.0,
  "frontal": {
    "simetria": <0-99>,
    "proporcao_tercos": <0-99>,
    "largura_zigomatica": <0-99>,
    "masculinidade_estrutural": <0-99>,
    "harmonia_nariz": <0-99>,
    "linha_cabelo": <0-99>,
    "olheiras": <0-99>,
    "qualidade_pele": <0-99>,
    "rugas": <0-99>,
    "definicao_facial": <0-99>,
    "puffiness_adiposidade_facial": <0-99>,
    "respiracao_nasal": <0-99>,
    "harmonia_geral": <0-99>
  },
  "lateral": {
    "available": ${!isPartial},
    "projecao_queixo": ${isPartial ? "null" : "<0-99>"},
    "definicao_mandibula": ${isPartial ? "null" : "<0-99>"},
    "angulo_goniaco": ${isPartial ? "null" : "<0-99>"},
    "projecao_maxilar": ${isPartial ? "null" : "<0-99>"},
    "harmonia_perfil": ${isPartial ? "null" : "<0-99>"}
  },
  "structural_diagnosis": {
    "projecao_mandibular": "...",
    "alinhamento_cervical": "...",
    "definicao_terco_inferior": "...",
    "gordura_facial": "...",
    "simetria_estrutural": "...",
    "textura_pele": "...",
    "regiao_ocular": "...",
    "sinais_inchaco": "...",
    "prioridades": ["...", "...", "..."],
    "severidade": { "area1": 8, "area2": 6 },
    "impacto_visual": { "area1": 9, "area2": 7 }
  },
  "notes": {
    "top_strengths": ["até 3 itens curtos em pt-br"],
    "top_weaknesses": ["até 3 itens curtos em pt-br"],
    "quality_flags": []
  }
}

Se não for um rosto válido: {"isValidFace": false, "reason": "explicação breve em português"}

Diretrizes de score:
- 90-99: Excepcional, nível modelo
- 80-89: Muito atrativo
- 70-79: Atrativo, boas features
- 60-69: Médio
- 50-59: Abaixo da média
- 0-49: Áreas significativas para melhoria

Seja realista e preciso. Não infle scores.`,,
    });

    imageContents.push({
      type: "image_url",
      image_url: { url: frontalImage },
    });

    if (lateralImage) {
      imageContents.push({
        type: "image_url",
        image_url: { url: lateralImage },
      });
    }

    const provider = "lovable-gateway";
    const model = "google/gemini-2.5-flash";
    const startedAt = performance.now();

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: imageContents,
          },
        ],
      }),
    });

    const latencyMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      const retryAfter = Number(response.headers.get("retry-after") || "0");
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      const requestId = response.headers.get("x-request-id") || response.headers.get("x-amzn-requestid") || null;
      const status_code = response.status;
      const error_text = await response.text();

      logEvent({
        type: "provider_error",
        user_id,
        ip,
        provider,
        status_code,
        error_message: error_text,
        rate_limit_headers: {
          retry_after: retryAfter,
          x_ratelimit_remaining: rateLimitRemaining,
        },
        request_id: requestId,
      });
      await safeInsertLog({
        event_type: "provider_error",
        provider,
        status_code,
        error_message: error_text.slice(0, 500),
        retry_after: retryAfter,
        x_ratelimit_remaining: rateLimitRemaining,
        request_id: requestId,
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            status: "error",
            error_code: "RATE_LIMIT",
            message: "Aguarde alguns segundos para uma nova análise.",
            retry_after_seconds: retryAfter || 30,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            status: "error",
            error_code: "QUOTA_EXCEEDED",
            message: "Você atingiu o limite diário gratuito.",
            limit: null,
            remaining: null,
            reset_at: null,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          status: "error",
          error_code: "PROVIDER_ERROR",
          message: "Erro na análise. Tente novamente.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    jsonStr = jsonStr.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(JSON.stringify({ error: "Erro ao processar análise. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed.isValidFace) {
      return new Response(JSON.stringify({
        isValidFace: false,
        reason: parsed.reason || "Imagem inválida. Envie uma foto clara do seu rosto.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const f = parsed.frontal;
    const l = parsed.lateral;
    const hasLateral = l?.available !== false && l?.projecao_queixo != null;

    // New component: definição/puffiness
    const definicao = ((f.definicao_facial ?? 50) + (f.puffiness_adiposidade_facial ?? 50)) / 2;

    let ger: number;

    if (hasLateral) {
      // Full analysis with lateral
      const mandibula = ((l.definicao_mandibula + l.projecao_queixo) / 2);
      const simetria = f.simetria;
      const macas = f.largura_zigomatica;
      const perfil = ((l.harmonia_perfil + l.projecao_maxilar) / 2);
      const pele = f.qualidade_pele;
      const hairline = f.linha_cabelo;
      const proporcoes = f.proporcao_tercos;
      const olheirasRugas = ((f.olheiras + f.rugas) / 2);
      const outros = ((f.masculinidade_estrutural + f.harmonia_nariz + l.angulo_goniaco) / 3);

      ger = Math.round(
        mandibula * 0.18 +
        simetria * 0.14 +
        macas * 0.10 +
        perfil * 0.14 +
        pele * 0.08 +
        hairline * 0.08 +
        proporcoes * 0.10 +
        olheirasRugas * 0.05 +
        outros * 0.05 +
        definicao * 0.08
      );
    } else {
      // Partial analysis (no lateral): redistribute lateral weights
      const simetria = f.simetria;
      const macas = f.largura_zigomatica;
      const pele = f.qualidade_pele;
      const hairline = f.linha_cabelo;
      const proporcoes = f.proporcao_tercos;
      const olheirasRugas = ((f.olheiras + f.rugas) / 2);
      const outros = ((f.masculinidade_estrutural + f.harmonia_nariz) / 2);

      // Weights redistributed from mandibula(0.18) + perfil(0.14) = 0.32
      // -> definicao +0.12, simetria +0.08, proporcoes +0.07, outros +0.05
      ger = Math.round(
        simetria * 0.22 +
        macas * 0.10 +
        pele * 0.08 +
        hairline * 0.08 +
        proporcoes * 0.17 +
        olheirasRugas * 0.05 +
        outros * 0.10 +
        definicao * 0.20
      );
    }

    const clampedGer = Math.max(0, Math.min(99, ger));
    const tier = getTier(clampedGer);
    const nextTier = getNextTier(clampedGer);
    const secondaryScore = +(clampedGer / 10).toFixed(1);

    const attributes = [
      { id: "masculinidade", name: "Masculinidade", score: f.masculinidade_estrutural, icon: "masculinidade" },
      { id: "definicao_facial", name: "Definição Facial", score: f.definicao_facial ?? 50, icon: "definicao" },
      { id: "puffiness", name: "Adiposidade Facial", score: f.puffiness_adiposidade_facial ?? 50, icon: "puffiness" },
      { id: "respiracao", name: "Respiração Nasal", score: f.respiracao_nasal ?? 50, icon: "respiracao" },
      { id: "harmonia_geral", name: "Harmonia Geral", score: f.harmonia_geral ?? f.proporcao_tercos ?? 50, icon: "harmonia" },
      { id: "macas", name: "Maçãs do Rosto", score: f.largura_zigomatica, icon: "macas" },
      { id: "hairline", name: "Linha do Cabelo", score: f.linha_cabelo, icon: "hairline" },
      { id: "simetria", name: "Simetria", score: f.simetria, icon: "simetria" },
      { id: "olheiras", name: "Olheiras", score: f.olheiras, icon: "olheiras" },
      { id: "rugas", name: "Rugas", score: f.rugas, icon: "rugas" },
      { id: "pele", name: "Qualidade da Pele", score: f.qualidade_pele, icon: "pele" },
      { id: "proporcao", name: "Proporção Facial", score: f.proporcao_tercos, icon: "proporcao" },
      { id: "nariz", name: "Harmonia do Nariz", score: f.harmonia_nariz, icon: "nariz" },
      ...(hasLateral ? [
        { id: "mandibula", name: "Linha da Mandíbula", score: l.definicao_mandibula, icon: "mandibula" },
        { id: "queixo", name: "Projeção do Queixo", score: l.projecao_queixo, icon: "queixo" },
        { id: "maxilar", name: "Projeção Maxilar", score: l.projecao_maxilar, icon: "maxilar" },
        { id: "perfil", name: "Harmonia do Perfil", score: l.harmonia_perfil, icon: "perfil" },
        { id: "goniaco", name: "Ângulo Goníaco", score: l.angulo_goniaco, icon: "goniaco" },
      ] : []),
    ];

    const getDesc = (score: number, low: string, high: string, mid: string = "Média") => {
      if (score < 45) return low;
      if (score > 75) return high;
      return mid;
    };

    const technicalBreakdown = {
      asymmetry: getDesc(f.simetria, "Alta Assimetria", "Simétrica", "Moderada"),
      thirds: getDesc(f.proporcao_tercos, "Desproporcional", "Equilibrada"),
      jawline: hasLateral ? getDesc(l.definicao_mandibula, "Recuada", "Forte/Projetada") : "Não avaliado",
      cheekbones: getDesc(f.largura_zigomatica, "Baixa projeção", "Proeminente"),
      eyes: getDesc(f.olheiras, "Cansada/Olheiras", "Vívida", "Neutro"),
      nose: getDesc(f.harmonia_nariz, "Desarmônico", "Harmônico"),
      fwhr: getDesc(f.harmonia_geral ?? 50, "Fora do ideal", "Ideal", "Médio"),
      breathing: getDesc(f.respiracao_nasal ?? 50, "Bucal (Mouth Breather)", "Nasal (Nasal Breather)", "Mista/Neutro"),
    };

    const sorted = [...attributes].sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, 3).map((a) => a.name);
    const weaknesses = sorted.slice(-3).map((a) => a.name);

    const result = {
      isValidFace: true,
      isPartial,
      ger: clampedGer,
      secondaryScore,
      tier: tier.name,
      nextTier: nextTier ? { name: nextTier.name, pointsNeeded: nextTier.min - clampedGer } : null,
      attributes,
      technicalBreakdown,
      strengths,
      weaknesses,
      report: {
        summary: `Seu GER atual é ${clampedGer} (${tier.name}). ${
          nextTier
            ? `Para atingir ${nextTier.name} (${nextTier.min}+), foque em melhorar: ${weaknesses.join(", ")}.`
            : "Você está no nível máximo!"
        }`,
        strongPoints: strengths,
        weakPoints: weaknesses,
      },
    };

    const providerMeta = {
      provider,
      model,
      latency_ms: latencyMs,
      request_id: response.headers.get("x-request-id") || response.headers.get("x-amzn-requestid") || null,
    };

    const imageMeta = (() => {
      const meta: Record<string, unknown> = {};
      const extract = (dataUrl: string | null, key: "front" | "side") => {
        if (!dataUrl || typeof dataUrl !== "string") return;
        if (!dataUrl.startsWith("data:")) return;
        const [header, base64] = dataUrl.split(",");
        const mimeMatch = header.match(/^data:(.*?);base64$/);
        const mime = mimeMatch ? mimeMatch[1] : null;
        const bytes = base64 ? Math.floor((base64.length * 3) / 4) : null;
        meta[key] = { mime, bytes };
      };
      extract(frontalImage, "front");
      extract(lateralImage, "side");
      return Object.keys(meta).length > 0 ? meta : null;
    })();

    const pickMood = (score: number) => {
      if (score >= 86) return ["cinematic", "luxury"];
      if (score >= 76) return ["aura", "cinematic"];
      if (score >= 66) return ["confident", "focus"];
      if (score >= 55) return ["calm", "clean"];
      return ["dark", "sigma"];
    };

    type CandidateTrack = {
      track_id: string;
      track_name: string;
      artist: string;
      spotify_url: string;
      preview_url: string | null;
      tags: string[];
    };

    const chooseTrackDeterministic = (arr: CandidateTrack[], seedStr: string) => {
      if (!arr || arr.length === 0) return null;
      let h = 0;
      for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
      return arr[h % arr.length];
    };

    if (!Number.isFinite(result.ger) || typeof result.tier !== "string") {
      return new Response(JSON.stringify({
        status: "error",
        error_code: "INVALID_RESULT",
        message: "Erro ao processar análise. Tente novamente.",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let historyRow: { id: number; created_at: string } | null = null;
    let songMatch: {
      track_name: string;
      artist: string;
      spotify_url: string;
      preview_url: string | null;
      mood_tags: string[];
      reason: string;
    } | null = null;

    if (supabase && user_id) {
      try {
        const source = isPartial ? "front" : "front_lateral";
        const [m1, m2] = pickMood(clampedGer);
        let { data: candidates } = await supabase
          .from("spotify_tracks")
          .select("track_id, track_name, artist, spotify_url, preview_url, tags")
          .contains("tags", [m1, m2])
          .eq("playlist_id", "54KgUD5Oji30CA9iNjdEZO");
        if (!candidates || candidates.length === 0) {
          const fallbackTags = pickMood(clampedGer);
          const { data: candidates2 } = await supabase
            .from("spotify_tracks")
            .select("track_id, track_name, artist, spotify_url, preview_url, tags")
            .contains("tags", fallbackTags)
            .eq("playlist_id", "54KgUD5Oji30CA9iNjdEZO");
          candidates = candidates2 || [];
        }
        if (!candidates || candidates.length === 0) {
          const { data: allTracks } = await supabase
            .from("spotify_tracks")
            .select("track_id, track_name, artist, spotify_url, preview_url, tags")
            .eq("playlist_id", "54KgUD5Oji30CA9iNjdEZO");
          candidates = allTracks || [];
        }
        const picked = chooseTrackDeterministic(candidates as CandidateTrack[], `${user_id}:${analysisId}`);
        if (picked) {
          songMatch = {
            track_name: picked.track_name,
            artist: picked.artist,
            spotify_url: picked.spotify_url,
            preview_url: picked.preview_url || null,
            mood_tags: [m1, m2],
            reason: `Sua vibe está mais "${m1} + ${m2}".`,
          };
        }

        const { data: history, error: historyError } = await supabase
          .from("analysis_history")
          .upsert(
            {
              user_id,
              analysis_id: analysisId,
              result_json: { ...result, ...(songMatch ? { song_match: songMatch } : {}) },
              source,
              score: clampedGer,
              rank: tier.name,
              provider_meta: providerMeta,
              image_meta: imageMeta,
            },
            { onConflict: "user_id,analysis_id" },
          )
          .select("id, created_at")
          .single();
        if (historyError) {
          throw historyError;
        }
        historyRow = history;
        await safeInsertLog({
          event_type: "analysis_success",
          provider,
          ger: clampedGer,
          tier: tier.name,
        });
      } catch (err) {
        logEvent({ type: "analysis_history_insert_error", error: String(err) });
      }
    }

    const responseBody = {
      ...result,
      ...(songMatch ? { song_match: songMatch } : {}),
      allowed: true,
      attempts_remaining: guardInfo.isPremium ? null : guardInfo.remaining,
      reset_in_seconds: 0,
      limit: guardInfo.isPremium ? null : guardInfo.limit,
      is_premium: guardInfo.isPremium,
      limits_disabled: limitsDisabled,
      history_id: historyRow?.id ?? null,
      created_at: historyRow?.created_at ?? new Date().toISOString(),
      cooldown_seconds: limitsDisabled ? 0 : COOLDOWN_SECONDS,
    };

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logEvent({
      type: "function_error",
      error_message: e instanceof Error ? e.message : String(e),
    });
    return new Response(JSON.stringify({
      status: "error",
      error_code: "FUNCTION_ERROR",
      message: e instanceof Error ? e.message : "Erro desconhecido",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
