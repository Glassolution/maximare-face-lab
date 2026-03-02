# 🚀 INSTRUÇÕES PARA CONFIGURAR INFRAESTRUTURA DO SUPABASE

## 📋 RESUMO DOS PROBLEMAS RESOLVIDOS

Esta migration resolve os 4 problemas identificados:

1. ✅ **Migrations não aplicadas** - Cria tabelas e colunas
2. ✅ **Função RPC não registrada** - Registra `generate_referral_code`
3. ✅ **Permissões RLS bloqueando** - Configura políticas corretas
4. ✅ **Cache do cliente Supabase** - Adiciona funções de controle

---

## 🔧 PASSO A PASSO PARA APLICAR

### 1. APLICAR A MIGRATION

```bash
# No terminal, na pasta do projeto
npx supabase db push
```

OU manualmente no Supabase Dashboard:

1. Abra o Supabase Dashboard
2. Vá para "SQL Editor"
3. Copie e cole o conteúdo do arquivo:
   `supabase/migrations/20260301000002_fix_referral_infrastructure.sql`
4. Execute o script

### 2. VERIFICAR SE TUDO FUNCIONOU

Execute o script de teste:

1. No Supabase Dashboard → "SQL Editor"
2. Copie e cole o conteúdo do arquivo:
   `supabase/migrations/test_referral_infrastructure.sql`
3. Execute o script

**Resultado esperado:**
```
table_name    | exists_flag
-------------|------------
referral_codes| t
profiles     | t

column_name   | data_type | is_nullable
-------------|-----------|------------
referral_code | text      | YES

routine_name            | routine_type | data_type
-----------------------|--------------|------------
generate_referral_code  | FUNCTION     | boolean

policyname                                  | permissive | roles | cmd | qual
-------------------------------------------|------------|-------|-----|-----
Users can view their own referral codes      | t          | {}    | SELECT| (auth.uid() = creator_id)
Users can insert their own referral codes    | t          | {}    | INSERT| (auth.uid() = creator_id)
Users can update their own referral codes    | t          | {}    | INSERT| (auth.uid() = creator_id)
Users can delete their own referral codes    | t          | {}    | DELETE| (auth.uid() = creator_id)

check_referral_infrastructure() result:
table_exists | column_exists | function_exists | policies_exist
-------------|---------------|-----------------|--------------
t            | t             | t               | t
```

---

## 🎯 O QUE A MIGRATION FAZ

### 1. CRIAÇÃO DE TABELAS
```sql
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. ADICIONA COLUNA EM PROFILES
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text;
```

### 3. CRIA FUNÇÃO RPC
```sql
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_creator_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Verifica se usuário é criador
-- Insere ou atualiza código
-- Atualiza tabela profiles
-- Retorna true/false
END;
$$;
```

### 4. CONFIGURA POLÍTICAS RLS
```sql
-- Permite usuários verem/criarem seus próprios códigos
CREATE POLICY "Users can view their own referral codes"
ON public.referral_codes FOR SELECT
USING (auth.uid() = creator_id);
```

### 5. FUNÇÕES AUXILIARES
- `check_referral_infrastructure()` - Verifica se tudo está funcionando
- `clear_referral_code_cache()` - Limpa cache se necessário

---

## 🔍 TESTES MANUAIS

### Testar geração de código:
```sql
SELECT public.generate_referral_code(
  'USER_ID_AQUI', -- ID real do usuário
  'MAX1234'
);
```

### Verificar código salvo:
```sql
SELECT code, created_at 
FROM public.referral_codes 
WHERE creator_id = 'USER_ID_AQUI';
```

### Verificar profile atualizado:
```sql
SELECT referral_code 
FROM public.profiles 
WHERE id = 'USER_ID_AQUI';
```

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### Se a migration falhar:
1. Verifique se você tem permissões de administrador
2. Execute cada bloco SQL separadamente
3. Verifique os logs de erro no Supabase

### Se a função não funcionar:
1. Verifique se o usuário tem `is_ugc = true`
2. Verifique se as políticas RLS estão ativas
3. Verifique os logs da função

### Se o código não persistir:
1. Execute `SELECT * FROM public.check_referral_infrastructure();`
2. Verifique se todas as flags estão como `true`
3. Limpe o cache com `SELECT public.clear_referral_code_cache('USER_ID');`

---

## ✅ CONFIRMAÇÃO FINAL

Após aplicar a migration e executar os testes, o sistema deve:

1. ✅ Ter tabela `referral_codes` funcionando
2. ✅ Ter coluna `referral_code` em `profiles`
3. ✅ Ter função RPC `generate_referral_code` registrada
4. ✅ Ter políticas RLS configuradas
5. ✅ Permitir busca e save de códigos
6. ✅ Manter persistência entre sessões

**O código de referência deve agora funcionar permanentemente!**
