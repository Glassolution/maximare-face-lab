import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function getTier(ger: number) {
  return TIERS.find((t) => ger >= t.min && ger <= t.max) || TIERS[0];
}

function getNextTier(ger: number) {
  const current = getTier(ger);
  const idx = TIERS.indexOf(current);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { frontalImage, lateralImage } = await req.json();

    if (!frontalImage) {
      return new Response(JSON.stringify({ error: "Foto frontal é obrigatória." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPartial = !lateralImage;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const imageContents: Array<{ type: string; image_url?: { url: string }; text?: string }> = [];

    imageContents.push({
      type: "text",
      text: `You are an expert facial aesthetics analyst. Analyze the provided face photo(s) and return a JSON object with scores from 0-99 for each attribute.

${isPartial ? "Only a FRONTAL photo was provided. Mark lateral-only attributes with your best estimate but reduce confidence." : "Both FRONTAL and LATERAL photos were provided. Analyze all attributes with full precision."}

You MUST return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "isValidFace": true,
  "isPartial": ${isPartial},
  "frontal": {
    "simetria": <0-99>,
    "proporcao_tercos": <0-99>,
    "largura_zigomatica": <0-99>,
    "masculinidade_estrutural": <0-99>,
    "harmonia_nariz": <0-99>,
    "linha_cabelo": <0-99>,
    "olheiras": <0-99>,
    "qualidade_pele": <0-99>,
    "rugas": <0-99>
  },
  "lateral": {
    "projecao_queixo": <0-99>,
    "definicao_mandibula": <0-99>,
    "angulo_goniaco": <0-99>,
    "projecao_maxilar": <0-99>,
    "harmonia_perfil": <0-99>
  }
}

If the image is NOT a valid face photo (blurry, dark, filtered, not a human face), return:
{"isValidFace": false, "reason": "brief explanation in Portuguese"}

Score guidelines:
- 90-99: Exceptional, model-tier
- 80-89: Very attractive, above average
- 70-79: Attractive, good features
- 60-69: Average, some areas to improve
- 50-59: Below average
- 0-49: Significant areas for improvement

Be realistic and precise. Do not inflate scores.`,
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: imageContents,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas análises em pouco tempo. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro na análise. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    jsonStr = jsonStr.trim();

    let parsed;
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

    // Calculate GER with weights
    const f = parsed.frontal;
    const l = parsed.lateral;

    const mandibula = ((l.definicao_mandibula + l.projecao_queixo) / 2);
    const simetria = f.simetria;
    const macas = f.largura_zigomatica;
    const perfil = ((l.harmonia_perfil + l.projecao_maxilar) / 2);
    const pele = f.qualidade_pele;
    const hairline = f.linha_cabelo;
    const proporcoes = f.proporcao_tercos;
    const olheirasRugas = ((f.olheiras + f.rugas) / 2);
    const outros = ((f.masculinidade_estrutural + f.harmonia_nariz + l.angulo_goniaco) / 3);

    const ger = Math.round(
      mandibula * 0.20 +
      simetria * 0.15 +
      macas * 0.10 +
      perfil * 0.15 +
      pele * 0.10 +
      hairline * 0.10 +
      proporcoes * 0.10 +
      olheirasRugas * 0.05 +
      outros * 0.05
    );

    const clampedGer = Math.max(0, Math.min(99, ger));
    const tier = getTier(clampedGer);
    const nextTier = getNextTier(clampedGer);
    const secondaryScore = +(clampedGer / 10).toFixed(1);

    // Build attributes array for display
    const attributes = [
      { id: "masculinidade", name: "Masculinidade", score: f.masculinidade_estrutural, icon: "masculinidade" },
      { id: "mandibula", name: "Linha da Mandíbula", score: l.definicao_mandibula, icon: "mandibula" },
      { id: "macas", name: "Maçãs do Rosto", score: f.largura_zigomatica, icon: "macas" },
      { id: "hairline", name: "Linha do Cabelo", score: f.linha_cabelo, icon: "hairline" },
      { id: "simetria", name: "Simetria", score: f.simetria, icon: "simetria" },
      { id: "olheiras", name: "Olheiras", score: f.olheiras, icon: "olheiras" },
      { id: "rugas", name: "Rugas", score: f.rugas, icon: "rugas" },
      { id: "pele", name: "Qualidade da Pele", score: f.qualidade_pele, icon: "pele" },
      { id: "proporcao", name: "Proporção Facial", score: f.proporcao_tercos, icon: "proporcao" },
      { id: "nariz", name: "Harmonia do Nariz", score: f.harmonia_nariz, icon: "nariz" },
      { id: "queixo", name: "Projeção do Queixo", score: l.projecao_queixo, icon: "queixo" },
      { id: "maxilar", name: "Projeção Maxilar", score: l.projecao_maxilar, icon: "maxilar" },
      { id: "perfil", name: "Harmonia do Perfil", score: l.harmonia_perfil, icon: "perfil" },
      { id: "goniaco", name: "Ângulo Goníaco", score: l.angulo_goniaco, icon: "goniaco" },
    ];

    // Strengths and weaknesses
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

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-face error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
