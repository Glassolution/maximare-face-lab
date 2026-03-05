import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { getValidAccessToken } from "@/lib/session";
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
  Lock,
  Crown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type PaymentMethod = "pix" | "credit_card";
type CheckoutStep = "method" | "card_form" | "pix_qr" | "success";

const C = {
  bg: "#0D0D14",
  card: "#13131F",
  blue: "#4F6EF7",
  text: "#FFFFFF",
  sub: "rgba(255,255,255,0.5)",
  dim: "rgba(255,255,255,0.3)",
  border: "rgba(255,255,255,0.06)",
  green: "#22C55E",
};

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshProfile } = useAuth();
  const rawPlanId = searchParams.get("plan");
  const planId: PlanType = rawPlanId === "yearly" ? "yearly" : "monthly";
  const plan = PLAN_CONFIG.PLANS[planId];

  const [step, setStep] = useState<CheckoutStep>("method");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // PIX state
  const [pixCode, setPixCode] = useState("");
  const [pixQrBase64, setPixQrBase64] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const pixPollTimeoutRef = useRef<number | null>(null);

  // Card state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardCpf, setCardCpf] = useState("");

  const [mpReady, setMpReady] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = () => setMpReady(true);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const priceFormatted = `R$ ${plan.price.toFixed(2).replace(".", ",")}`;

  // ─── Payment handlers (preserved logic) ───

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
          body: JSON.stringify({ payment_method: "pix", planId, payer: { email: user?.email || "" } }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar PIX");
      setPixCode(data.pix_copy_paste || data.pix_qr_code || "");
      setPixQrBase64(data.pix_qr_code_base64 || "");
      setPaymentId(String(data.payment_id || ""));
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
      const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
      if (!publicKey || !(window as any).MercadoPago) throw new Error("SDK do Mercado Pago não carregado");
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
      if (!cardTokenResult?.id) throw new Error("Erro ao tokenizar cartão");
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
            payer: { email: user?.email || "", identification: { type: "CPF", number: cardCpf.replace(/\D/g, "") } },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao processar pagamento");
      setPaymentId(String(data.payment_id || ""));
      if (data.status === "approved") {
        setStep("success");
        setTimeout(() => refreshProfile(), 1500);
      } else if (data.status === "in_process" || data.status === "pending") {
        toast.info("Pagamento em processamento.");
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

  const checkPaymentStatus = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!paymentId) { if (!silent) toast.error("Nenhum pagamento em aberto"); return; }
    if (!silent) setCheckingPayment(true);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("Sessão expirada");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ payment_id: paymentId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao consultar");
      if (data.status === "approved") {
        setStep("success");
        await refreshProfile();
        toast.success("Pagamento confirmado!");
        return;
      }
      if (!silent && (data.status === "pending" || data.status === "in_process")) toast.info("Pagamento ainda pendente.");
      if (!silent && data.status && !["pending", "in_process"].includes(data.status)) toast.error(`Status: ${data.status_detail || data.status}`);
    } catch (err: any) {
      if (!silent) toast.error(err.message);
    } finally {
      if (!silent) setCheckingPayment(false);
    }
  };

  useEffect(() => {
    if (step !== "pix_qr" || !paymentId) return;
    const poll = async () => {
      await checkPaymentStatus({ silent: true });
      pixPollTimeoutRef.current = window.setTimeout(poll, 6000);
    };
    pixPollTimeoutRef.current = window.setTimeout(poll, 6000);
    return () => { if (pixPollTimeoutRef.current) window.clearTimeout(pixPollTimeoutRef.current); };
  }, [step, paymentId]);

  const copyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  const formatCardNumber = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 16);
    return d.replace(/(\d{4})(?=\d)/g, "$1 ");
  };
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length >= 3) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return d;
  };
  const formatCpf = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  // ─── Auto-redirect on success ───
  useEffect(() => {
    if (step !== "success") return;
    const t = setTimeout(() => navigate("/analysis"), 3000);
    return () => clearTimeout(t);
  }, [step]);

  // ─── RENDER ───

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <div className="max-w-md mx-auto px-6 py-6 pb-32 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: C.card }}
            onClick={() => step === "method" ? navigate("/premium") : setStep("method")}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: C.text }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: C.text }}>
            {step === "success" ? "Pagamento Aprovado" : "Checkout"}
          </h1>
        </div>

        <AnimatePresence mode="wait">

          {/* ═══ STEP: METHOD ═══ */}
          {step === "method" && (
            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

              {/* Payment methods */}
              <div className="space-y-2">
                <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: C.sub }}>
                  Método de pagamento
                </p>

                {/* PIX */}
                <div
                  className="p-4 cursor-pointer transition-all flex items-center gap-4"
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 20,
                    border: paymentMethod === "pix" ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
                  }}
                  onClick={() => setPaymentMethod("pix")}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
                    <QrCode className="w-6 h-6" style={{ color: C.green }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[15px]" style={{ color: C.text }}>PIX</p>
                    <p className="text-[12px]" style={{ color: C.sub }}>Instantâneo</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: paymentMethod === "pix" ? C.blue : C.dim,
                      backgroundColor: paymentMethod === "pix" ? C.blue : "transparent",
                    }}
                  >
                    {paymentMethod === "pix" && <Check className="w-3 h-3" style={{ color: C.text }} />}
                  </div>
                </div>

                {/* Card */}
                <div
                  className="p-4 cursor-pointer transition-all flex items-center gap-4"
                  style={{
                    backgroundColor: C.card,
                    borderRadius: 20,
                    border: paymentMethod === "credit_card" ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
                  }}
                  onClick={() => setPaymentMethod("credit_card")}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${C.blue}15` }}>
                    <CreditCard className="w-6 h-6" style={{ color: C.blue }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[15px]" style={{ color: C.text }}>Cartão de crédito</p>
                    <p className="text-[12px]" style={{ color: C.sub }}>Aprovação imediata</p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: paymentMethod === "credit_card" ? C.blue : C.dim,
                      backgroundColor: paymentMethod === "credit_card" ? C.blue : "transparent",
                    }}
                  >
                    {paymentMethod === "credit_card" && <Check className="w-3 h-3" style={{ color: C.text }} />}
                  </div>
                </div>
              </div>

              {/* Order summary */}
              <div className="space-y-3" style={{ backgroundColor: C.card, borderRadius: 20, padding: 20, border: `1px solid ${C.border}` }}>
                <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: C.sub }}>Resumo</p>
                <div className="flex justify-between text-[14px]">
                  <span style={{ color: C.sub }}>Plano {plan.title}</span>
                  <span style={{ color: C.text }}>{priceFormatted}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span style={{ color: C.sub }}>Desconto</span>
                  <span style={{ color: C.green }}>R$ 0,00</span>
                </div>
                <div style={{ height: 1, backgroundColor: C.border }} />
                <div className="flex justify-between text-[16px] font-bold">
                  <span style={{ color: C.text }}>Total</span>
                  <span style={{ color: C.text }}>{priceFormatted}</span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="text-center space-y-1 pt-1">
                <p className="text-[11px]" style={{ color: C.dim }}>
                  🔒 Pagamento seguro via Mercado Pago
                </p>
                <p className="text-[11px]" style={{ color: C.dim }}>
                  ✓ Cancele quando quiser
                </p>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP: CARD FORM ═══ */}
          {step === "card_form" && (
            <motion.div key="card_form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px]" style={{ color: C.sub }}>Número do Cartão</Label>
                <Input
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className="border-0 text-white placeholder:text-gray-500"
                  style={{ backgroundColor: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]" style={{ color: C.sub }}>Nome no Cartão</Label>
                <Input
                  placeholder="NOME COMPLETO"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  className="border-0 text-white placeholder:text-gray-500"
                  style={{ backgroundColor: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px]" style={{ color: C.sub }}>Validade</Label>
                  <Input
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    className="border-0 text-white placeholder:text-gray-500"
                    style={{ backgroundColor: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]" style={{ color: C.sub }}>CVV</Label>
                  <Input
                    placeholder="123"
                    type="password"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    className="border-0 text-white placeholder:text-gray-500"
                    style={{ backgroundColor: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]" style={{ color: C.sub }}>CPF do Titular</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={cardCpf}
                  onChange={(e) => setCardCpf(formatCpf(e.target.value))}
                  maxLength={14}
                  className="border-0 text-white placeholder:text-gray-500"
                  style={{ backgroundColor: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}
                />
              </div>
            </motion.div>
          )}

          {/* ═══ STEP: PIX QR ═══ */}
          {step === "pix_qr" && (
            <motion.div key="pix_qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 text-center">
              <p className="text-sm" style={{ color: C.sub }}>
                Escaneie o QR Code ou copie o código PIX
              </p>

              {pixQrBase64 && (
                <div className="flex justify-center">
                  <div className="bg-white p-4" style={{ borderRadius: 20 }}>
                    <img src={`data:image/png;base64,${pixQrBase64}`} alt="PIX QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              {pixCode && (
                <div className="space-y-2">
                  <div
                    className="p-3 text-xs break-all font-mono max-h-20 overflow-y-auto"
                    style={{ backgroundColor: C.card, borderRadius: 14, color: C.sub, border: `1px solid ${C.border}` }}
                  >
                    {pixCode}
                  </div>
                  <button
                    className="w-full py-3 font-semibold text-[14px] flex items-center justify-center gap-2"
                    style={{ backgroundColor: C.card, borderRadius: 50, color: C.text, border: `1px solid ${C.border}` }}
                    onClick={copyPix}
                  >
                    {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar código PIX</>}
                  </button>
                </div>
              )}

              <p className="text-xs" style={{ color: C.dim }}>
                Após o pagamento, seu Premium será ativado automaticamente.
              </p>

              <button
                className="w-full py-3 font-medium text-[14px]"
                style={{ color: C.blue, backgroundColor: "transparent" }}
                disabled={!paymentId || checkingPayment}
                onClick={() => checkPaymentStatus()}
              >
                {checkingPayment ? "Verificando pagamento..." : "Já paguei"}
              </button>
            </motion.div>
          )}

          {/* ═══ STEP: SUCCESS ═══ */}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 py-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${C.blue}20` }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <Check className="w-12 h-12" style={{ color: C.blue }} />
                </motion.div>
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold" style={{ color: C.text }}>
                  Premium Ativado! 🎉
                </h2>
                <p className="text-sm mt-2" style={{ color: C.sub }}>
                  Seu plano foi ativado com sucesso
                </p>
              </div>

              <div
                className="p-4 text-left space-y-2"
                style={{ backgroundColor: C.card, borderRadius: 20, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5" style={{ color: C.blue }} />
                  <span className="font-semibold text-[15px]" style={{ color: C.text }}>Plano {plan.title}</span>
                </div>
                <p className="text-[13px]" style={{ color: C.sub }}>
                  Valor: {priceFormatted}
                </p>
              </div>

              <button
                className="w-full py-3.5 font-bold text-[15px] flex items-center justify-center gap-2"
                style={{ backgroundColor: C.blue, color: C.text, borderRadius: 50 }}
                onClick={() => navigate("/analysis")}
              >
                Começar a usar <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed bottom button (method & card_form steps) */}
      {(step === "method" || step === "card_form") && (
        <div className="fixed bottom-0 left-0 right-0 px-6 pb-6 pt-4" style={{ background: `linear-gradient(to top, ${C.bg}, transparent)` }}>
          <div className="max-w-md mx-auto">
            <button
              className="w-full py-4 font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ backgroundColor: C.text, color: C.blue, borderRadius: 50 }}
              disabled={step === "method" ? (!paymentMethod || loading) : loading}
              onClick={() => {
                if (step === "method") {
                  if (paymentMethod === "pix") handlePixPayment();
                  else setStep("card_form");
                } else {
                  handleCardPayment();
                }
              }}
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
              ) : step === "card_form" ? (
                <>Pagar {priceFormatted} <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Pagar {priceFormatted} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
