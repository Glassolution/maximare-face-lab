
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORRIGIDO: Adicionar métodos permitidos e headers completos
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = user.id;

    // Fetch user analysis history
    const { data: analyses, error: historyError } = await supabaseAdmin
        .from('face_analysis_events')
        .select('created_at, result_json')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    const analysisCount = analyses?.length || 0;
    const newBadges: string[] = [];

    // 1. First Analysis
    if (analysisCount >= 1) {
        newBadges.push('first_analysis');
    }

    // 2. Score 7+ (GER >= 70) and Elite (GER >= 80)
    let maxScore = 0;
    if (analyses) {
        analyses.forEach(a => {
            // Handle result_json structure (ger is a number at root level)
            const score = a.result_json?.ger || 0;
            if (score > maxScore) maxScore = score;
        });
    }

    if (maxScore >= 70) newBadges.push('score_7');
    if (maxScore >= 80) newBadges.push('elite_level');

    // 3. Streak Calculation (Consecutive Days)
    let currentStreak = 0;
    if (analyses && analyses.length > 0) {
        // Extract unique dates (YYYY-MM-DD)
        const uniqueDates = [...new Set(analyses.map(a => new Date(a.created_at).toISOString().split('T')[0]))].sort();
        
        if (uniqueDates.length > 0) {
            currentStreak = 1;
            // Iterate backwards from the latest date
            let lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
            
            for (let i = uniqueDates.length - 2; i >= 0; i--) {
                const currentDate = new Date(uniqueDates[i]);
                const diffTime = Math.abs(lastDate.getTime() - currentDate.getTime());
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays === 1) {
                    currentStreak++;
                    lastDate = currentDate;
                } else {
                    // Streak broken
                    break; 
                }
            }
        }
    }

    if (currentStreak >= 7) {
        newBadges.push('streak_7');
    }

    // 4. Insert Badges (Idempotent)
    const awarded: string[] = [];
    
    for (const badgeId of newBadges) {
        // Check if exists
        const { data: existing } = await supabaseAdmin
            .from('user_badges')
            .select('id')
            .eq('user_id', userId)
            .eq('badge_id', badgeId)
            .maybeSingle();
            
        if (!existing) {
            await supabaseAdmin.from('user_badges').insert({
                user_id: userId,
                badge_id: badgeId
            });
            awarded.push(badgeId);
        }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      badges_awarded: awarded,
      stats: { streak: currentStreak, analysisCount, maxScore }
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
