# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.

## 🚀 Como Testar Pagamento em Produção (Checklist)

Para validar que o sistema de pagamentos está funcionando corretamente em produção, siga este checklist.

### Pré-requisitos
- Conta no Mercado Pago (Sandbox ou Produção) configurada.
- Variáveis de ambiente definidas no Vercel/Supabase (`MERCADOPAGO_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_DEBUG_MODE=true` para logs).

### Passo a Passo

1.  **Login:** Acesse a aplicação e faça login.
2.  **Console:** Abra o Developer Tools (F12) e verifique se `[Auth]` logs estão aparecendo (se `VITE_DEBUG_MODE=true`).
3.  **Checkout:**
    - Vá para `/premium` ou clique em um recurso bloqueado.
    - Escolha "Cartão" (Testes) ou "PIX" (Real/Sandbox).
    - **PIX:** Gere o QR Code. Copie e pague (no Sandbox do MP App ou banco real com valor baixo).
    - **Cartão:** Use cartões de teste do Mercado Pago.
4.  **Verificação (Fluxo Automático):**
    - Após pagar, aguarde na tela do QR Code.
    - O sistema deve detectar o pagamento em até 10 segundos (Polling Inteligente).
    - **Logs Esperados:**
        - `[Checkout] Checking payment status via RPC: ...`
        - `[Checkout] RPC Approved. Forcing session refresh...`
        - `[Auth] Forcing session refresh...`
        - `[Auth] Session refreshed & data reloaded.`
        - `[Checkout] Final Profile State: { is_premium: true, status: 'active', ... }`
5.  **Verificação (Fallback Manual):**
    - Se demorar, clique em "Já realizei o pagamento".
    - Deve aparecer o Toast "Confirmado!" e redirecionar.

### 🛡️ Fonte da Verdade (Premium Status)

O sistema utiliza uma validação estrita para determinar se o usuário é Premium. Não confiamos apenas em flags booleanas simples.

- **Tabela:** `public.profiles`
- **Campos Críticos:**
    - `subscription_status`: Deve ser `'active'` ou `'trialing'`.
    - `subscription_expires_at`: Deve ser uma data **futura** (`> new Date()`).
- **Lógica (Frontend `usePremiumStatus`):**
    ```typescript
    const isValid = (status === 'active' || status === 'trialing') && (expires ? expires > now : false);
    ```
    *Nota: O campo `is_premium` no banco é mantido para facilidade de queries simples, mas o frontend valida a expiração.*

### 🆘 Suporte e Debug

- **Debug Mode:** Defina `VITE_DEBUG_MODE=true` no `.env` para ver logs detalhados de Auth e Checkout.
- **Canal de Suporte:** O botão "Falar com Suporte" no fallback de timeout aponta para `mailto:suporte@maximare.com.br`. Verifique se este email é monitorado.

- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
