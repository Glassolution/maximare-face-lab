import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { getValidAccessToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Shield,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type PaymentMethod = "pix" | "credit_card";
type CheckoutStep = "method" | "card_form" | "pix_qr" | "success";

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshProfile } = useAuth();
  const planId = (searchParams.get("plan") || "monthly") as PlanType;
  const plan = PLAN_CONFIG.PLANS[planId];

  const [step, setStep] = useState<CheckoutStep>("method");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // PIX state
  const [pixCode, setPixCode] = useState("");
  const [pixQrBase64, setPixQrBase64] = useState("");
  const [copied, setCopied] = useState(false);

  // Card state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardCpf, setCardCpf] = useState("");

  // MP SDK
  const [mpReady, setMpReady] = useState(false);

  useEffect(() => {
    // Load MercadoPago SDK for card tokenization
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = () => setMpReady(true);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  if (!plan) {
    navigate("/premium");
    return null;
  }

  const handlePixPayment = async () => {
    setLoading(true);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("Sessão expirada");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            payment_method: "pix",
            planId,
            payer: { email: user?.email || "" },
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar PIX");

      setPixCode(data.pix_copy_paste || data.pix_qr_code || "");
      setPixQrBase64(data.pix_qr_code_base64 || "");
      setStep("pix_qr");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PIX");
    } finally {
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv || !cardCpf) {
      toast.error("Preencha todos os campos do cartão");
      return;
    }

    setLoading(true);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("Sessão expirada");

      // Tokenize card with MP SDK
      const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
      if (!publicKey || !(window as any).MercadoPago) {
        throw new Error("SDK do Mercado Pago não carregado");
      }

      const mp = new (window as any).MercadoPago(publicKey);
      const [expMonth, expYear] = cardExpiry.split("/");

      const cardTokenResult = await mp.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ""),
        cardholderName: cardName,
        cardExpirationMonth: expMonth?.trim(),
        cardExpirationYear: expYear?.trim().length === 2 ? `20${expYear.trim()}` : expYear?.trim(),
        securityCode: cardCvv,
        identificationType: "CPF",
        identificationNumber: cardCpf.replace(/\D/g, ""),
      });

      if (!cardTokenResult?.id) {
        throw new Error("Erro ao tokenizar cartão");
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            payment_method: "credit_card",
            planId,
            card_token: cardTokenResult.id,
            installments: 1,
            payment_method_id: cardTokenResult.payment_method?.id || "master",
            payer: {
              email: user?.email || "",
              identification: {
                type: "CPF",
                number: cardCpf.replace(/\D/g, ""),
              },
            },
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao processar pagamento");

      if (data.status === "approved") {
        setStep("success");
        setTimeout(() => refreshProfile(), 1500);
      } else if (data.status === "in_process" || data.status === "pending") {
        toast.info("Pagamento em processamento. Você será notificado quando for aprovado.");
        navigate("/payment-callback?status=pending");
      } else {
        toast.error(`Pagamento recusado: ${data.status_detail || data.status}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar cartão");
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const formatCpf = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step === "method" ? navigate("/premium") : setStep("method"))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            {step === "success" ? "Pagamento Aprovado" : "Checkout"}
          </h1>
        </div>

        {/* Plan Summary */}
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{plan.title}</p>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              R$ {plan.price.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </Card>

        <AnimatePresence mode="wait">
          {/* Step: Choose method */}
          {step === "method" && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground font-medium">
                Escolha o método de pagamento
              </p>

              <Card
                className={`p-4 cursor-pointer transition-all border-2 hover:border-primary/60 ${
                  paymentMethod === "pix" ? "border-primary bg-primary/5" : "border-border"
                }`}
                onClick={() => setPaymentMethod("pix")}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">PIX</p>
                    <p className="text-xs text-muted-foreground">
                      Aprovação instantânea
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "pix"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {paymentMethod === "pix" && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
              </Card>

              <Card
                className={`p-4 cursor-pointer transition-all border-2 hover:border-primary/60 ${
                  paymentMethod === "credit_card"
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
                onClick={() => setPaymentMethod("credit_card")}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      Cartão de Crédito
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Visa, Master, Elo, Amex
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "credit_card"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {paymentMethod === "credit_card" && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
              </Card>

              <Button
                className="w-full mt-4"
                disabled={!paymentMethod || loading}
                onClick={() => {
                  if (paymentMethod === "pix") handlePixPayment();
                  else setStep("card_form");
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
            </motion.div>
          )}

          {/* Step: Card Form */}
          {step === "card_form" && (
            <motion.div
              key="card_form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Número do Cartão</Label>
                <Input
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>

              <div className="space-y-2">
                <Label>Nome no Cartão</Label>
                <Input
                  placeholder="NOME COMPLETO"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Input
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CVV</Label>
                  <Input
                    placeholder="123"
                    type="password"
                    value={cardCvv}
                    onChange={(e) =>
                      setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>CPF do Titular</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={cardCpf}
                  onChange={(e) => setCardCpf(formatCpf(e.target.value))}
                  maxLength={14}
                />
              </div>

              <Button
                className="w-full"
                disabled={loading}
                onClick={handleCardPayment}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...
                  </>
                ) : (
                  `Pagar R$ ${plan.price.toFixed(2).replace(".", ",")}`
                )}
              </Button>
            </motion.div>
          )}

          {/* Step: PIX QR Code */}
          {step === "pix_qr" && (
            <motion.div
              key="pix_qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5 text-center"
            >
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code ou copie o código PIX
              </p>

              {pixQrBase64 && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl">
                    <img
                      src={`data:image/png;base64,${pixQrBase64}`}
                      alt="PIX QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              {pixCode && (
                <div className="space-y-2">
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground break-all font-mono max-h-20 overflow-y-auto">
                    {pixCode}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={copyPix}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" /> Copiar código PIX
                      </>
                    )}
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Após o pagamento, seu Premium será ativado automaticamente em
                alguns segundos.
              </p>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate("/payment-callback?status=pending")}
              >
                Já paguei
              </Button>
            </motion.div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5 py-8"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Pagamento Aprovado!
              </h2>
              <p className="text-muted-foreground">
                Seu plano Premium já está ativo.
              </p>
              <Button className="w-full" onClick={() => navigate("/analysis")}>
                Começar a usar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust */}
        {step !== "success" && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
            <Shield className="w-4 h-4" />
            <span>Pagamento seguro • Seus dados estão protegidos</span>
          </div>
        )}
      </div>
    </div>
  );
}
