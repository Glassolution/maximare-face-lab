
# Guia de Migração: Webhook Premium 100% Supabase

Este guia descreve como remover a dependência da Lovable Cloud e garantir que o controle de pagamentos e status Premium seja feito exclusivamente via Supabase.

## FASE 1: Banco de Dados (SQL)

1.  Acesse o [Painel do Supabase](https://supabase.com/dashboard).
2.  Vá em **SQL Editor**.
3.  Copie e cole o conteúdo do arquivo `migration.sql` (na raiz do projeto).
4.  Clique em **Run**.
    *   Isso garantirá que as tabelas `purchases`, `webhook_events` e `paywall_events` existam e tenham as permissões corretas.

## FASE 2: Deploy das Edge Functions

Você precisa implantar a nova função `mercadopago-webhook` e a função utilitária `check-premium` (se houver alterações nela).

No terminal do projeto, execute:

```bash
npx supabase functions deploy mercadopago-webhook
```

(Se você não tiver o CLI do Supabase configurado, precisará configurar ou copiar o código para o painel online).

**Variáveis de Ambiente Necessárias:**
Certifique-se de que as seguintes variáveis estejam definidas no Supabase (Settings > Edge Functions):
*   `MERCADOPAGO_ACCESS_TOKEN`: Seu token de produção do Mercado Pago.
*   `SUPABASE_URL`: URL do seu projeto.
*   `SUPABASE_SERVICE_ROLE_KEY`: Chave secreta (service_role) do seu projeto.

## FASE 3: Configuração no Mercado Pago

Agora vamos apontar o Mercado Pago diretamente para sua nova função no Supabase.

1.  Acesse o [Painel de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers/panel).
2.  Selecione sua Aplicação.
3.  Vá em **Notificações Webhooks**.
4.  Em **Modo Produção**, edite a URL.
5.  Coloque a URL da sua Edge Function:
    `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook`
6.  Em **Eventos**, selecione apenas:
    *   `Pagamentos` (payments)
    *   `Merchant Orders` (opcional, mas recomendado)
7.  Salve.

## FASE 4: Testes e Validação

### Teste de Idempotência
1.  Faça uma compra de teste (ou simule um evento de webhook usando Postman).
2.  Verifique a tabela `webhook_events` no Supabase. O evento deve aparecer lá.
3.  Reenvie o mesmo evento. Ele **não** deve criar um novo registro nem processar novamente (o log da função mostrará "Already processed").

### Teste de Status
1.  Verifique se o `profiles` do usuário foi atualizado corretamente:
    *   `subscription_status` deve ser `active`.
    *   `subscription_expires_at` deve ser uma data futura.
    *   `plan_type` deve corresponder ao plano comprado.

### Teste de Frontend
1.  Acesse o aplicativo.
2.  O hook `usePremiumStatus` agora consulta apenas as colunas novas.
3.  Se você era premium via sistema antigo (Lovable/Legacy), você pode perder o acesso se não tiver migrado os dados.
    *   **Importante:** Se precisar migrar usuários antigos, você deve rodar um SQL manual para copiar `premium_until` para `subscription_expires_at`.

```sql
-- Exemplo de migração de dados legados (opcional)
UPDATE profiles
SET subscription_status = 'active',
    subscription_expires_at = premium_until,
    plan_type = 'legacy_premium'
WHERE premium_status = true
  AND premium_until > now()
  AND subscription_status IS NULL;
```

---

## Resumo das Mudanças no Código

1.  **`src/hooks/usePremiumStatus.ts`**: Limpo. Não verifica mais `premium_status` (legado).
2.  **`src/lib/paywall.ts`**: Limpo. Paywall agora obedece estritamente às colunas de assinatura.
3.  **`supabase/functions/mercadopago-webhook/index.ts`**: Refatorado.
    *   Verifica `webhook_events` antes de tudo.
    *   Mapeia status (`approved` -> `active`, `refunded` -> `refunded`, etc).
    *   Calcula expiração corretamente (soma ao tempo restante se já ativo).
    *   Usa `service_role` para ignorar RLS e garantir escrita.
4.  **`supabase/functions/_shared/auth-utils.ts`**: Criado para padronizar verificação no backend.
