-- MIGRATION: Force Update for Lucas (Chad Status)
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  target_email TEXT := 'lucassrby@gmail.com';
  target_user_id UUID;
  affected_rows INT;
  
  -- Template JSON para Chad (Tom Welling Archetype)
  chad_json JSONB := '{
    "isValidFace": true,
    "isPartial": false,
    "ger": 96,
    "tier": "high chad",
    "secondaryScore": 9.6,
    "attributes": [
      {"id": "masculinity", "name": "Masculinidade", "score": 98, "icon": "masculinidade", "color": "green", "description": "Ponto forte"},
      {"id": "definition", "name": "Definição Facial", "score": 97, "icon": "definicao", "color": "green", "description": "Ponto forte"},
      {"id": "puffiness", "name": "Adiposidade Facial", "score": 95, "icon": "puffiness", "color": "green", "description": "Ponto forte"},
      {"id": "breathing", "name": "Respiração Nasal", "score": 99, "icon": "respiracao", "color": "green", "description": "Ponto forte"},
      {"id": "harmony", "name": "Harmonia Geral", "score": 96, "icon": "harmonia", "color": "green", "description": "Ponto forte"},
      {"id": "cheekbones", "name": "Maçãs do Rosto", "score": 94, "icon": "macas", "color": "green", "description": "Ponto forte"},
      {"id": "hairline", "name": "Linha do Cabelo", "score": 95, "icon": "hairline", "color": "green", "description": "Ponto forte"},
      {"id": "symmetry", "name": "Simetria", "score": 92, "icon": "simetria", "color": "green", "description": "Ponto forte"},
      {"id": "eyes", "name": "Olhos (Olheiras)", "score": 90, "icon": "olheiras", "color": "green", "description": "Ponto forte"},
      {"id": "wrinkles", "name": "Rugas", "score": 92, "icon": "rugas", "color": "green", "description": "Ponto forte"},
      {"id": "skin", "name": "Qualidade da Pele", "score": 90, "icon": "pele", "color": "green", "description": "Ponto forte"},
      {"id": "thirds", "name": "Proporção Facial", "score": 95, "icon": "proporcao", "color": "green", "description": "Ponto forte"},
      {"id": "nose", "name": "Harmonia do Nariz", "score": 92, "icon": "nariz", "color": "green", "description": "Ponto forte"},
      {"id": "jawline", "name": "Linha da Mandíbula", "score": 99, "icon": "mandibula", "color": "green", "description": "Ponto forte"},
      {"id": "chin", "name": "Projeção do Queixo", "score": 98, "icon": "queixo", "color": "green", "description": "Ponto forte"},
      {"id": "maxilla", "name": "Projeção Maxilar", "score": 97, "icon": "maxilar", "color": "green", "description": "Ponto forte"},
      {"id": "profile", "name": "Harmonia do Perfil", "score": 96, "icon": "perfil", "color": "green", "description": "Ponto forte"},
      {"id": "gonial", "name": "Ângulo Goníaco", "score": 95, "icon": "goniaco", "color": "green", "description": "Ponto forte"}
    ],
    "technicalBreakdown": {
      "asymmetry": "Simétrica",
      "thirds": "Equilibrada",
      "jawline": "Forte/Projetada",
      "cheekbones": "Proeminente",
      "eyes": "Vívida/Caçador",
      "nose": "Harmônico",
      "fwhr": "Ideal (Warrior Skull)",
      "breathing": "Nasal (Nasal Breather)"
    },
    "report": {
      "summary": "Seu GER atual é 96 (high chad). Estrutura óssea de elite, mandíbula extremamente definida e dimorfismo sexual alto. Arquétipo Warrior Skull confirmado.",
      "strongPoints": ["Masculinidade Estrutural", "Mandíbula", "Olhos de Caçador"],
      "weakPoints": []
    },
    "structural_diagnosis": {
      "projecao_mandibular": "Projetada",
      "alinhamento_cervical": "Neutro",
      "definicao_terco_inferior": "Alta",
      "gordura_facial": "Baixa",
      "simetria_estrutural": "Alta",
      "textura_pele": "Uniforme",
      "regiao_ocular": "Vibrante",
      "sinais_inchaco": "Ausentes",
      "prioridades": [],
      "severidade": {},
      "impacto_visual": {}
    }
  }';

BEGIN
  -- 1. Obter ID do usuário
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NOT NULL THEN
    -- 2. Atualizar TODAS as análises recentes (últimas 24h) ou todas as análises se quiser ser agressivo
    -- Vamos atualizar as últimas 5 para garantir que o cache pegue a correta
    WITH updated AS (
      UPDATE public.analysis_history
      SET 
        score = 96,
        rank = 'high chad',
        result_json = jsonb_set(
          jsonb_set(
            chad_json, 
            '{provider_meta}', 
            COALESCE(result_json->'provider_meta', '{}'::jsonb)
          ),
          '{image_meta}',
          COALESCE(result_json->'image_meta', '{}'::jsonb)
        )
      WHERE user_id = target_user_id
      RETURNING id
    )
    SELECT COUNT(*) INTO affected_rows FROM updated;

    RAISE NOTICE 'Atualizadas % análises para o usuário %', affected_rows, target_email;
  ELSE
    RAISE NOTICE 'Usuário % não encontrado', target_email;
  END IF;
END $$;
