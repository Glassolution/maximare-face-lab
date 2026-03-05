import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Payment, initMercadoPago } from "@mercadopago/sdk-react";
import { Loader2, QrCode, CreditCard, AlertCircle, Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

// Planos disponiveis
// TESTE: Mensal a R$ 1,00 para testes
const PLANS = {
  monthly: { name: "Mensal (TESTE R$1)", price: 1.00, price_cents: 100, interval: "mês" },
  yearly: { name: "Anual", price: 99.90, price_cents: 9990, interval: "ano" },
};

// Inicializar MercadoPago com chave do .env
const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

if (MP_PUBLIC_KEY) {
  try {
    initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
  } catch (e) {
    console.error("[Checkout] Failed to init MercadoPago:", e);
  }
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
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);
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

  // Criar pagamento
  const createPayment = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

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

      setPreferenceId(data.preference_id);
      setPaymentId(data.payment_id);

      if (paymentMethod === "pix") {
        // Para PIX, precisamos criar o pagamento via API
        await createPixPayment(data.preference_id);
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

  // Criar pagamento PIX
  const createPixPayment = async (prefId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Criar pagamento PIX via MercadoPago
      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_amount: selectedPlanData.price,
          description: `Plano ${selectedPlanData.name} - Maximare`,
          payment_method_id: "pix",
          payer: {
            email: user.email,
            identification: {
              type: "CPF",
              number: cpf.replace(/\D/g, ""),
            },
          },
          notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`,
          external_reference: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[Checkout] PIX creation error:", error);
        toast.error("Erro ao gerar QR Code PIX");
        return;
      }

      const paymentData = await response.json();

      // Atualizar payment_id na tabela
      if (paymentId) {
        await supabase
          .from("payments")
          .update({ payment_id: String(paymentData.id) })
          .eq("id", paymentId);
      }

      // Extrair dados do PIX
      const pointOfInteraction = paymentData.point_of_interaction;
      if (pointOfInteraction?.transaction_data) {
        setPixQrCode(pointOfInteraction.transaction_data.qr_code_base64);
        setPixCopyPaste(pointOfInteraction.transaction_data.qr_code);
        setStep("pix");

        // Iniciar polling
        startPolling(String(paymentData.id));
      }
    } catch (e) {
      console.error("[Checkout] PIX error:", e);
      toast.error("Erro ao gerar PIX");
    }
  };

  // Polling para verificar status do pagamento
  const startPolling = (mpPaymentId: string) => {
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
        const { data, error } = await supabase.functions.invoke("check-payment-status", {
          body: { payment_id: paymentId },
        });

        if (error) {
          console.error("[Checkout] Polling error:", error);
          return;
        }

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

  // Handler para pagamento com cartão
  const handleCardPayment = async (formData: any) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        setLoading(false);
        return;
      }

      // Criar pagamento com cartão via MercadoPago
      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_amount: selectedPlanData.price,
          token: formData.token,
          description: `Plano ${selectedPlanData.name} - Maximare`,
          installments: formData.installments || 1,
          payment_method_id: formData.payment_method_id,
          payer: {
            email: user.email,
            identification: {
              type: "CPF",
              number: cpf.replace(/\D/g, ""),
            },
          },
          notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`,
          external_reference: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[Checkout] Card payment error:", error);
        toast.error("Erro ao processar cartão. Verifique os dados.");
        setLoading(false);
        return;
      }

      const paymentData = await response.json();

      if (paymentData.status === "approved") {
        setStep("success");
        toast.success("Pagamento aprovado! 🎉");
        setTimeout(() => {
          onSuccess();
          navigate("/", { state: { premiumActivated: true } });
        }, 2000);
      } else {
        toast.error(`Pagamento ${paymentData.status}. Tente novamente.`);
      }

      setLoading(false);
    } catch (e) {
      console.error("[Checkout] Card error:", e);
      toast.error("Erro ao processar pagamento");
      setLoading(false);
    }
  };

  // Copiar código PIX
  const copyPixCode = () => {
    if (pixCopyPaste) {
      navigator.clipboard.writeText(pixCopyPaste);
      toast.success("Código PIX copiado!");
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

  // Renderizar seletor de método
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
              <div className="text-sm text-zinc-400">Pagamento instantâneo</div>
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
              <div className="font-semibold">Cartão de Crédito</div>
              <div className="text-sm text-zinc-400">Até 12x sem juros</div>
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

  // Renderizar PIX
  if (step === "pix") {
    return (
      <div className="p-6 space-y-6 text-center">
        <h2 className="text-2xl font-bold">Pague com PIX</h2>

        {pixQrCode ? (
          <>
            <img
              src={`data:image/png;base64,${pixQrCode}`}
              alt="QR Code PIX"
              className="mx-auto w-64 h-64"
            />

            <div className="space-y-2">
              <p className="text-zinc-400">Escaneie o QR Code ou copie o código</p>
              <Button onClick={copyPixCode} variant="outline" className="gap-2">
                <Copy className="w-4 h-4" />
                Copiar código PIX
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Aguardando pagamento...
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin" />
          </div>
        )}

        <Button onClick={onCancel} variant="ghost" className="w-full">
          Cancelar
        </Button>
      </div>
    );
  }

  // Renderizar cartão
  if (step === "card") {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">Dados do cartão</h2>

        {MP_PUBLIC_KEY ? (
          <Payment
            initialization={{
              amount: selectedPlanData.price,
              preferenceId: preferenceId || undefined,
            }}
            customization={{
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
              },
            }}
            onSubmit={handleCardPayment}
            onError={(error) => {
              console.error("[Checkout] Brick error:", error);
              toast.error("Erro no formulário de pagamento");
            }}
          />
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p>Sistema de pagamento não configurado</p>
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
          Seu acesso premium está ativo. Aproveite todos os recursos!
        </p>

        <Button onClick={() => navigate("/")} className="w-full">
          Começar a usar
        </Button>
      </div>
    );
  }

  return null;
}
