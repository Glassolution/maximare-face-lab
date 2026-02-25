-- Update ALL analysis history for lucassrby@gmail.com to be PERFECT High Chad / True Adam
-- This ensures "todas as analises" (past and present) reflect the desired outcome.

UPDATE analysis_history
SET 
  score = 98,
  rank = 'true adam',
  result_json = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    result_json,
                    '{ger}', '98'
                  ),
                  '{tier}', '"true adam"'
                ),
                '{secondaryScore}', '9.8'
              ),
              '{technicalBreakdown,jawline}', '"Forte/Projetada"'
            ),
            '{technicalBreakdown,breathing}', '"Nasal (Nasal Breather)"'
          ),
          '{technicalBreakdown,fwhr}', '"Ideal (Warrior Skull)"'
        ),
        '{technicalBreakdown,eyes}', '"Hunter Eyes"'
      ),
      '{technicalBreakdown,cheekbones}', '"Proeminente"'
    ),
    '{technicalBreakdown,thirds}', '"Equilibrada"'
  )
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'lucassrby@gmail.com');
