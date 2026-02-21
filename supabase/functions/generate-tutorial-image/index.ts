import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Prompt Templates ───

const BASE_STYLE = `Minimalist vector illustration, app tutorial style, white/light gray background, clean lines, high legibility, no text in image, subtle arrows and soft markers, gender-neutral character, soft lighting, focus on correct posture/gesture. Simple flat design, medical-grade clarity.`;

interface PromptContext {
  intervention_type: string;
  step_index: number;
  step_title: string;
  step_description: string;
}

// Pre-built prompts for known interventions + steps
const INTERVENTION_PROMPTS: Record<string, Record<number, string>> = {
  "mewing-basic": {
    0: "Show a person in side profile with tongue pressed flat against the roof of the mouth (palate). Highlight the tongue position with a subtle arrow. Show correct jaw alignment.",
    1: "Close-up side view of a face with lips gently closed, teeth slightly touching. Highlight lip seal with a subtle circle marker.",
    2: "Person breathing through nose with mouth closed, arrows showing airflow through nostrils. Side profile view.",
    3: "Side view showing swallowing motion, tongue pushing against palate, cheeks relaxed. Arrow indicating upward tongue pressure.",
  },
  "chewing-hypertrophy": {
    0: "Person chewing gum, side view showing masseter muscle area highlighted with subtle glow/circle. Clean jaw angle visible.",
    1: "Front view of face with left and right jaw areas equally highlighted, showing bilateral chewing distribution. Arrows on both sides.",
    2: "Simple timer/clock icon next to a person chewing, indicating 15-20 minute duration. Clean infographic style.",
    3: "Person resting with hand near jaw, indicating rest day. Small warning icon near the ear/TMJ area.",
  },
  "sodium-flush": {
    0: "Simple illustration of food with a 'less salt' indicator - a salt shaker with reduction arrow. Clean infographic.",
    1: "Person drinking water from a glass, with water droplets and a '3-4L' indicator. Clean hydration concept.",
    2: "Bananas, sweet potatoes, and coconut water arranged neatly. Potassium-rich foods illustration.",
    3: "Fast food and processed items crossed out with a subtle X mark. Clean prohibition style.",
  },
  "lymphatic-drainage": {
    0: "Hands applying facial oil/moisturizer to face. Clean preparation step, product on fingertips.",
    1: "Side view of neck massage, arrows pointing downward from ear lobe toward collarbone. Lymphatic drainage direction.",
    2: "Front view, arrows along jawline from chin toward ears. Light pressure massage direction indicators.",
    3: "Close-up of eye area, ring finger gently touching under-eye. Arrow from inner corner toward temples.",
    4: "Forehead massage, arrows from center outward toward temples. Gentle sweeping motion indicated.",
  },
  "caloric-deficit": {
    0: "Simple calculator icon with 'TDEE' text concept. Clean infographic of calorie calculation.",
    1: "Balance scale showing slight deficit - food plate slightly smaller than energy output. Clean concept.",
    2: "Protein-rich foods (chicken, eggs, fish) arranged neatly. High protein concept illustration.",
    3: "Calendar with progress markers, showing patience/consistency concept. Clean timeline.",
  },
  "basic-skincare": {
    0: "Hands washing face with gentle cleanser, water splashing. Clean morning/night routine concept.",
    1: "Fingertip with moisturizer dot, applying to cheek. Simple hydration step.",
    2: "Sunscreen bottle with SPF 30+ label, being applied to face. Sun protection concept with small sun icon.",
  },
  "retinol-protocol": {
    0: "Night scene icon, person applying small amount of product. Calendar showing '2x/week'. Gradual introduction concept.",
    1: "Close-up of fingertip with pea-sized amount of cream. Highlight showing correct quantity, face blurred in background.",
    2: "Sandwich method: three layers shown - moisturizer, retinoid, moisturizer. Simple layering diagram.",
    3: "Sun icon with sunscreen bottle. Emphasis on daily SPF use. Photosensitivity warning concept.",
  },
  "ice-eyes": {
    0: "Ice cube wrapped in thin cloth, or cold roller. Never direct ice on skin concept.",
    1: "Circular massage motion around eye area with cold tool. Arrows showing circular pattern.",
    2: "Morning routine concept - alarm clock + cold compress on eyes. Daily consistency.",
  },
  "chin-tucks": {
    0: "Person standing against wall, side profile. Arrow showing chin retracting backward horizontally. Correct head alignment.",
    1: "Same position, holding the retracted chin position. 5-second timer indicator.",
    2: "Repetition concept - '10 reps x 3/day' with simple counter visualization.",
    3: "Person at desk/phone with correct posture vs incorrect (forward head). Comparison illustration.",
  },
  "neck-training": {
    0: "Person lying on bench, head hanging off edge, flexing neck (chin to chest). Arrow showing movement direction.",
    1: "Person lying face down, extending neck upward. Arrow showing extension movement.",
    2: "Small weight plate with towel on forehead concept. Progressive overload indicator.",
    3: "Controlled slow movement arrows. Safety/control emphasis.",
  },
};

function buildPrompt(ctx: PromptContext): string {
  const specific = INTERVENTION_PROMPTS[ctx.intervention_type]?.[ctx.step_index];
  
  if (specific) {
    return `${BASE_STYLE} ${specific}`;
  }
  
  // Fallback: generate from step description
  return `${BASE_STYLE} Tutorial step illustration for: "${ctx.step_title}". ${ctx.step_description}. Show the correct technique clearly.`;
}

function generateKey(type: string, step: number, locale: string, version: number): string {
  return `${type}_step_${step}_${locale}_v${version}`;
}

function hashPrompt(prompt: string): string {
  // Simple hash for deduplication
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intervention_type, step_index, locale = "pt-BR", step_title, step_description } = await req.json();

    if (!intervention_type || step_index === undefined || !step_title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const version = 1;
    const key = generateKey(intervention_type, step_index, locale, version);
    const prompt = buildPrompt({ intervention_type, step_index, step_title, step_description });
    const pHash = hashPrompt(prompt);

    // 1. Check cache
    const { data: cached } = await supabase
      .from("tutorial_assets")
      .select("image_url")
      .eq("key", key)
      .single();

    if (cached?.image_url) {
      return new Response(JSON.stringify({ image_url: cached.image_url, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Also check by hash (same prompt different key)
    const { data: hashCached } = await supabase
      .from("tutorial_assets")
      .select("image_url")
      .eq("prompt_hash", pHash)
      .limit(1)
      .single();

    if (hashCached?.image_url) {
      // Reuse existing image, just create new key entry
      await supabase.from("tutorial_assets").insert({
        key,
        intervention_type,
        step_index,
        locale,
        version,
        style: "minimal_app_guide",
        image_url: hashCached.image_url,
        prompt_hash: pHash,
      });

      return new Response(JSON.stringify({ image_url: hashCached.image_url, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Generate image via Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Image generation not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI generation failed:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      console.error("No image in AI response");
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Upload to storage
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const filePath = `${intervention_type}/${key}.png`;

    const { error: uploadError } = await (supabase as any).storage
      .from("tutorial-images")
      .upload(filePath, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = (supabase as any).storage
      .from("tutorial-images")
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // 5. Save to tutorial_assets
    await supabase.from("tutorial_assets").insert({
      key,
      intervention_type,
      step_index,
      locale,
      version,
      style: "minimal_app_guide",
      image_url: imageUrl,
      prompt_hash: pHash,
    });

    return new Response(JSON.stringify({ image_url: imageUrl, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
