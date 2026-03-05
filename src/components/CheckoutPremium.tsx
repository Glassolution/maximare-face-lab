import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { Loader2, QrCode, CreditCard, AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

// Planos disponiveis
// TESTE: Mensal a R$ 1,00 para testes
const PLANS = {
  monthly: { name: "Mensal", price: 1.00, price_cents: 100, interval: "mês" },
  yearly: { name: "Anual", price: 99.90, price_cents: 9990, interval: "ano" },
};

// CORRIGIDO: Inicializar MercadoPago imediatamente com import direto
const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
console.log('[Checkout] MP_PUBLIC_KEY available:', !!MP_PUBLIC_KEY);

// Inicializar fora do componente para garantir que carregue antes
if (MP_PUBLIC_KEY) {
  try {
    initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
    console.log('[Checkout] MercadoPago SDK initialized successfully');
  } catch (e) {
    console.error('[Checkout] Failed to init MercadoPago:', e);
  }
} else {
  console.error('[Checkout] VITE_MERCADOPAGO_PUBLIC_KEY not found in environment');
}

interface CheckoutPremiumProps {
  plan: "monthly" | "yearly";
  price: number;
  onSuccess: (email?: string) => void;
  onCancel: () => void;
}

// Mascara para CPF
function formatCPF(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
}

export function CheckoutPremium({ plan, price, onSuccess, onCancel }: CheckoutPremiumProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"plan" | "method" | "pix" | "card" | "processing" | "success">("plan");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(plan);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | null>(null);
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const selectedPlanData = PLANS[selectedPlan];

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // CORRIGIDO: Criar pagamento via Edge Function (supabase.functions.invoke adiciona token automaticamente)
  const createPayment = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Usuario nao autenticado");
        setLoading(false);
        return;
      }

      console.log('[Checkout] Creating payment for user:', user.id, 'plan:', selectedPlan);

      // CORRIGIDO: supabase.functions.invoke adiciona o token de autenticacao automaticamente
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          user_id: user.id,
          user_email: user.email,
          plan_id: selectedPlan,
        },
      });

      if (error) {
        console.error("[Checkout] create-payment error:", error);
        toast.error("Erro ao criar pagamento. Tente novamente.");
        setLoading(false);
        return;
      }

      console.log('[Checkout] Payment created:', data);
      console.log('[Checkout] preference_id:', data.preference_id);

      setPreferenceId(data.preference_id);
      setPaymentId(data.payment_id);

      // Avancar para o step de pagamento (PIX ou Cartao)
      if (paymentMethod === "pix") {
        setStep("pix");
        // Iniciar polling para PIX
        startPolling(data.payment_id);
      } else {
        setStep("card");
      }

      setLoading(false);
    } catch (e) {
      console.error("[Checkout] Error:", e);
      toast.error("Erro ao processar pagamento");
      setLoading(false);
    }
  }, [selectedPlan, paymentMethod]);

  // CORRIGIDO: Polling (supabase.functions.invoke adiciona token automaticamente)
  const startPolling = (internalPaymentId: string) => {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutos (5s * 120)

    const interval = setInterval(async () => {
      attempts++;

      if (attempts > maxAttempts) {
        clearInterval(interval);
        toast.error("Tempo expirado. Verifique o status na sua conta.");
        return;
      }

      try {
        console.log('[Checkout] Polling check-payment-status for:', internalPaymentId);

        // CORRIGIDO: supabase.functions.invoke adiciona o token de autenticacao automaticamente
        const { data, error } = await supabase.functions.invoke("check-payment-status", {
          body: { payment_id: internalPaymentId },
        });

        if (error) {
          console.error("[Checkout] Polling error:", error);
          return;
        }

        console.log('[Checkout] Payment status:', data.status);

        if (data.status === "approved") {
          clearInterval(interval);
          setStep("success");
          setTimeout(() => {
            onSuccess();
            navigate("/", { state: { premiumActivated: true } });
          }, 2000);
        }
      } catch (e) {
        console.error("[Checkout] Polling exception:", e);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  // Handler para pagamento com cartao via Brick
  const handleCardPayment = async (formData: any) => {
    setLoading(true);
    try {
      console.log('[Checkout] Card payment submitted, starting polling');
      // O Brick do MercadoPago ja processou o pagamento
      // Aguardamos o webhook atualizar o status
      // Iniciamos polling para verificar
      if (paymentId) {
        startPolling(paymentId);
      }
      setLoading(false);
    } catch (e) {
      console.error("[Checkout] Card error:", e);
      toast.error("Erro ao processar pagamento");
      setLoading(false);
    }
  };

  // Handler para pagamento PIX via Brick
  const handlePixPayment = async (formData: any) => {
    setLoading(true);
    try {
      console.log('[Checkout] PIX payment submitted, starting polling');
      // O Brick do MercadoPago ja processou o pagamento
      // Iniciamos polling para verificar
      if (paymentId) {
        startPolling(paymentId);
      }
      setLoading(false);
    } catch (e) {
      console.error("[Checkout] PIX error:", e);
      toast.error("Erro ao processar PIX");
      setLoading(false);
    }
  };

  // Renderizar seletor de plano
  if (step === "plan") {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">Escolha seu plano</h2>

        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((planKey) => {
            const planData = PLANS[planKey];
            const isSelected = selectedPlan === planKey;

            return (
              <button
                key={planKey}
                onClick={() => setSelectedPlan(planKey)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-green-500 bg-green-500/10"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <div className="font-semibold">{planData.name}</div>
                <div className="text-2xl font-bold">
                  R$ {planData.price.toFixed(2).replace(".", ",")}
                </div>
                <div className="text-sm text-zinc-400">/{planData.interval}</div>
                {planKey === "yearly" && (
                  <div className="text-xs text-green-400 mt-2">Economize 66%</div>
                )}
              </button>
            );
          })}
        </div>

        <Button onClick={() => setStep("method")} className="w-full">
          Continuar
        </Button>
        <Button onClick={onCancel} variant="ghost" className="w-full">
          Cancelar
        </Button>
      </div>
    );
  }

  // Renderizar seletor de metodo
  if (step === "method") {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">Forma de pagamento</h2>

        <div className="space-y-3">
          <button
            onClick={() => setPaymentMethod("pix")}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
              paymentMethod === "pix"
                ? "border-green-500 bg-green-500/10"
                : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <QrCode className="w-8 h-8" />
            <div className="text-left">
              <div className="font-semibold">PIX</div>
              <div className="text-sm text-zinc-400">Pagamento instantaneo</div>
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod("credit_card")}
            className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
              paymentMethod === "credit_card"
                ? "border-green-500 bg-green-500/10"
                : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <CreditCard className="w-8 h-8" />
            <div className="text-left">
              <div className="font-semibold">Cartao de Credito</div>
              <div className="text-sm text-zinc-400">Ate 12x sem juros</div>
            </div>
          </button>
        </div>

        {paymentMethod && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <Button
              onClick={createPayment}
              disabled={cpf.replace(/\D/g, "").length !== 11 || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                `Pagar R$ ${selectedPlanData.price.toFixed(2).replace(".", ",")}`
              )}
            </Button>
          </div>
        )}

        <Button onClick={() => setStep("plan")} variant="ghost" className="w-full">
          Voltar
        </Button>
      </div>
    );
  }

  // CORRIGIDO: Renderizar PIX via Brick com logs
  if (step === "pix") {
    console.log('[Checkout] Rendering PIX step, preferenceId:', preferenceId, 'MP_PUBLIC_KEY:', !!MP_PUBLIC_KEY);

    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">Pague com PIX</h2>

        {MP_PUBLIC_KEY && preferenceId ? (
          <>
            <Payment
              initialization={{
                amount: selectedPlanData.price,
                preferenceId: preferenceId,
              }}
              customization={{
                paymentMethods: {
                  bankTransfer: "all",
                },
              }}
              onSubmit={handlePixPayment}
              onError={(error) => {
                console.error("[Checkout] Brick PIX error:", error);
                toast.error("Erro no formulario de pagamento PIX");
              }}
            />
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Aguardando pagamento...
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p>Carregando formulario PIX...</p>
            {!MP_PUBLIC_KEY && <p className="text-red-500 text-sm mt-2">Erro: Public Key nao configurada</p>}
            {!preferenceId && <p className="text-red-500 text-sm mt-2">Erro: Preference ID nao gerado</p>}
          </div>
        )}

        <Button onClick={onCancel} variant="ghost" className="w-full">
          Cancelar
        </Button>
      </div>
    );
  }

  // Renderizar cartao via Brick
  if (step === "card") {
    console.log('[Checkout] Rendering Card step, preferenceId:', preferenceId);

    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">Dados do cartao</h2>

        {MP_PUBLIC_KEY && preferenceId ? (
          <Payment
            initialization={{
              amount: selectedPlanData.price,
              preferenceId: preferenceId,
            }}
            customization={{
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                mercadoPago: "all",
              } as any,
            }}
            onSubmit={handleCardPayment}
            onError={(error) => {
              console.error("[Checkout] Brick error:", error);
              toast.error("Erro no formulario de pagamento");
            }}
          />
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p>Carregando formulario de cartao...</p>
            {!MP_PUBLIC_KEY && <p className="text-red-500 text-sm mt-2">Erro: Public Key nao configurada</p>}
            {!preferenceId && <p className="text-red-500 text-sm mt-2">Erro: Preference ID nao gerado</p>}
          </div>
        )}

        <Button onClick={() => setStep("method")} variant="ghost" className="w-full">
          Voltar
        </Button>
      </div>
    );
  }

  // Renderizar sucesso
  if (step === "success") {
    return (
      <div className="p-6 text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-12 h-12 text-white" />
        </div>

        <h2 className="text-2xl font-bold">Premium ativado com sucesso! 🎉</h2>
        <p className="text-zinc-400">
          Seu acesso premium esta ativo. Aproveite todos os recursos!
        </p>

        <Button onClick={() => navigate("/")} className="w-full">
          Comecar a usar
        </Button>
      </div>
    );
  }

  return null;
}
