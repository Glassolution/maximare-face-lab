import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { getValidAccessToken } from "@/lib/session";
import { Input } from "@/components/ui/input";
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
  ChevronLeft,
  MoreHorizontal,
  CheckCircle,
  Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type PaymentMethod = "pix" | "credit_card";
type CheckoutStep = "method" | "add_method" | "card_form" | "pix_qr" | "success";

type SavedPaymentMethod = {
  id: string;
  type: PaymentMethod;
  last4?: string;
  brand?: string;
  email?: string;
  name?: string;
};

const CARD_BRANDS: Record<string, { name: string; pattern: RegExp; color: string }> = {
  visa: { name: "Visa", pattern: /^4/, color: "#1A1F71" },
  mastercard: { name: "Mastercard", pattern: /^(5[1-5]|2[2-7])/, color: "#EB001B" },
  amex: { name: "Amex", pattern: /^3[47]/, color: "#006FCF" },
  elo: { name: "Elo", pattern: /^(4011|4312|4389|4514|4576|5041|5066|5067|509)/, color: "#FF7800" },
  hipercard: { name: "Hipercard", pattern: /^(6062|6376|6381|3841)/, color: "#790098" },
  discover: { name: "Discover", pattern: /^6011/, color: "#FF6000" },
};

const detectCardBrand = (number: string): { name: string; color: string } | null => {
  const cleaned = number.replace(/\D/g, "");
  if (cleaned.length < 2) return null;

  for (const [key, brand] of Object.entries(CARD_BRANDS)) {
    if (brand.pattern.test(cleaned)) {
      return { name: brand.name, color: brand.color };
    }
  }
  return null;
};

const C = {
  bg: "#000000",
  card: "#1C1C1E",
  blue: "#4F6EF7",
  text: "#FFFFFF",
  sub: "rgba(255,255,255,0.5)",
  dim: "rgba(255,255,255,0.4)",
  border: "rgba(255,255,255,0.12)",
  thickBorder: "rgba(255,255,255,0.15)",
  green: "#00E676",
  pixGreen: "#00C853",
  badgeBg: "rgba(0, 230, 118, 0.1)",
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [showAddMethod, setShowAddMethod] = useState(false);

  // Saved payment methods
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<string | null>(null);

  // Card brand detection
  const [detectedBrand, setDetectedBrand] = useState<{ name: string; color: string } | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);

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

  const originalPrice = plan.price;
  const finalPrice = Math.max(0, originalPrice - discount);
  const priceFormatted = `R$ ${finalPrice.toFixed(2).replace(".", ",")}`;
  const originalPriceFormatted = `R$ ${originalPrice.toFixed(2).replace(".", ",")}`;
  const discountFormatted = `R$ ${discount.toFixed(2).replace(".", ",")}`;

  // ─── Payment handlers (preserved logic) ───

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error("Digite um código de cupom");
      return;
    }
    // Mock coupon logic - in production this would validate with backend
    if (couponCode.toUpperCase() === "MAXIMARE10") {
      setAppliedCoupon("MAXIMARE10");
      setDiscount(10);
      toast.success("Cupom aplicado! Você economizou R$ 10,00");
    } else {
      toast.error("Cupom inválido ou expirado");
    }
  };

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
        // Save card to saved methods
        const last4 = cardNumber.replace(/\s/g, "").slice(-4);
        const brand = detectedBrand?.name || "Cartão";
        const newCardMethod: SavedPaymentMethod = {
          id: `card_${Date.now()}`,
          type: "credit_card",
          last4,
          brand,
          name: cardName,
        };
        setSavedMethods([...savedMethods, newCardMethod]);
        setSelectedSavedMethod(newCardMethod.id);

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
    // Detect brand as user types
    const brand = detectCardBrand(d);
    setDetectedBrand(brand);
    return d.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleCardNumberChange = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 16);
    const formatted = d.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
    const brand = detectCardBrand(d);
    setDetectedBrand(brand);
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
    <div className="min-h-screen flex flex-col bg-iosBg" style={{ backgroundColor: C.bg, fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 h-11 relative">
        <button
          className="flex items-center text-primary text-[17px] active:opacity-50 transition-opacity"
          style={{ color: C.blue }}
          onClick={() => step === "method" ? navigate("/premium") : setStep("method")}
        >
          <ChevronLeft className="w-6 h-6" />
          <span>Voltar</span>
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-white">
          {step === "success" ? "Pagamento Aprovado" : "Checkout"}
        </h1>
        <button className="w-7 h-7 bg-[#2C2C2E] rounded-full flex items-center justify-center active:opacity-50 transition-opacity">
          <MoreHorizontal className="w-[18px] h-[18px] text-white" />
        </button>
      </header>

      <main className="flex-1 px-4 pt-4 space-y-6 max-w-md mx-auto w-full pb-48">
        <AnimatePresence mode="wait">

          {/* ═══ STEP: METHOD ═══ */}
          {step === "method" && (
            <motion.div key="method" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

              {/* Saved Payment Method - Only show selected one */}
              {savedMethods.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-[13px] text-white/50 uppercase px-1 font-medium tracking-wide">Método Salvo</h2>
                  {(() => {
                    const method = savedMethods.find(m => m.id === selectedSavedMethod) || savedMethods[0];
                    return (
                      <div
                        key={method.id}
                        className="bg-iosCard rounded-[12px] overflow-hidden cursor-pointer"
                        style={{ backgroundColor: C.card }}
                        onClick={() => {
                          setSelectedSavedMethod(method.id);
                          setPaymentMethod(method.type);
                        }}
                      >
                        <div className="flex items-center p-4 gap-4">
                          {method.type === "pix" ? (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                              <QrCode className="w-8 h-8" style={{ color: C.pixGreen }} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10">
                              <CreditCard className="w-6 h-6 text-white/80" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-[15px] leading-tight font-medium text-white">
                              {method.type === "pix" ? "PIX" : method.brand}
                            </p>
                            <p className="text-[13px] text-white/40">
                              {method.type === "pix" ? method.email : `**** ${method.last4}`}
                            </p>
                          </div>
                          <CheckCircle className="w-6 h-6" style={{ color: C.blue }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Payment methods */}
              <div className="space-y-3">
                {savedMethods.length > 0 && (
                  <h2 className="text-[13px] text-white/50 uppercase px-1 font-medium tracking-wide">Novo Pagamento</h2>
                )}
                {/* PIX */}
                <div className="bg-iosCard rounded-[12px] overflow-hidden" style={{ backgroundColor: C.card }}>
                  <div
                    className="flex items-center p-4 gap-4 active:bg-white/5 cursor-pointer"
                    onClick={() => setPaymentMethod("pix")}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                      <QrCode className="w-8 h-8" style={{ color: C.pixGreen }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[17px] leading-tight font-medium text-white">PIX</p>
                      <p className="text-[13px] text-white/40">Confirmação instantânea</p>
                    </div>
                    {paymentMethod === "pix" ? (
                      <CheckCircle className="w-6 h-6" style={{ color: C.blue }} />
                    ) : (
                      <Circle className="w-6 h-6" style={{ color: "rgba(255,255,255,0.3)" }} />
                    )}
                  </div>

                  {/* Credit Card Option */}
                  <div className="ios-divider" style={{ backgroundColor: C.border }} />
                  <div
                    className="flex items-center p-4 gap-4 active:bg-white/5 cursor-pointer"
                    onClick={() => setPaymentMethod("credit_card")}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-7 h-7 text-white/60" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[17px] leading-tight font-medium text-white">Cartão de Crédito</p>
                      <p className="text-[13px] text-white/40">Aprovação imediata</p>
                    </div>
                    {paymentMethod === "credit_card" ? (
                      <CheckCircle className="w-6 h-6" style={{ color: C.blue }} />
                    ) : (
                      <Circle className="w-6 h-6" style={{ color: "rgba(255,255,255,0.3)" }} />
                    )}
                  </div>
                </div>
              </div>

              {/* Coupon */}
              <div className="space-y-2">
                <h2 className="text-[13px] text-white/50 uppercase px-1 font-medium tracking-wide">CUPOM</h2>
                <div className="bg-iosCard rounded-[12px] p-2 pl-4 flex items-center gap-2" style={{ backgroundColor: C.card }}>
                  <input
                    className="bg-transparent border-none focus:ring-0 flex-1 text-[17px] p-0 placeholder:text-white/20 text-white outline-none"
                    placeholder="Insira o código"
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    className="bg-primary text-white px-5 py-2 rounded-[8px] font-semibold text-[15px] active:opacity-80 transition-opacity"
                    style={{ backgroundColor: C.blue }}
                    onClick={handleApplyCoupon}
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-2">
                <h2 className="text-[13px] text-white/50 uppercase px-1 font-medium tracking-wide">RESUMO DO PEDIDO</h2>
                <div className="bg-iosCard rounded-[12px] p-4 space-y-3" style={{ backgroundColor: C.card }}>
                  <div className="flex justify-between items-center text-[15px]">
                    <span className="text-white/70">Preço original</span>
                    <span className="text-white/40 line-through">{originalPriceFormatted}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-[15px]">
                      <span className="text-white/70">Cupom aplicado</span>
                      <span className="font-bold" style={{ color: C.green }}>- {discountFormatted}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[15px]">
                    <span className="text-white/70">Taxa de serviço</span>
                    <span className="text-white/40">R$ 0,00</span>
                  </div>
                  <div className="thick-divider !my-4" style={{ height: 1.5, backgroundColor: C.thickBorder }} />
                  <div className="flex justify-between items-center">
                    <span className="text-[17px] font-bold text-white">Total</span>
                    <span className="text-[17px] font-bold text-white">{priceFormatted}</span>
                  </div>
                  {discount > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-center rounded-[8px] py-1.5" style={{ backgroundColor: C.badgeBg, border: `1px solid ${C.green}30` }}>
                        <span className="text-[13px] font-bold" style={{ color: C.green }}>✓ Você economiza {discountFormatted}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex flex-col items-center justify-center gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-white/40 text-[12px]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pagamento seguro via Mercado Pago</span>
                  <span className="ml-1 font-medium" style={{ color: C.green }}>✓ Valid</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-white/40 text-[12px]">Método: {paymentMethod === "pix" ? "PIX" : "Cartão de Crédito"}</p>
                  <p className="text-white/40 text-[12px]">Plano: {plan.title}</p>
                  <p className="text-white/40 text-[12px]">Validade: {planId === "yearly" ? "12 meses" : "30 dias"}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP: CARD FORM ═══ */}
          {step === "card_form" && (
            <motion.div key="card_form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] text-white/50">Número do Cartão</label>
                <div className="bg-iosCard rounded-[12px] p-4 flex items-center gap-3" style={{ backgroundColor: C.card }}>
                  <input
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    maxLength={19}
                    className="bg-transparent border-none focus:ring-0 flex-1 text-[17px] text-white placeholder:text-white/20 outline-none"
                  />
                  {detectedBrand && (
                    <div
                      className="px-2 py-1 rounded text-[10px] font-bold text-white"
                      style={{ backgroundColor: detectedBrand.color }}
                    >
                      {detectedBrand.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] text-white/50">Nome no Cartão</label>
                <div className="bg-iosCard rounded-[12px] p-4" style={{ backgroundColor: C.card }}>
                  <input
                    placeholder="NOME COMPLETO"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="bg-transparent border-none focus:ring-0 w-full text-[17px] text-white placeholder:text-white/20 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[13px] text-white/50">Validade</label>
                  <div className="bg-iosCard rounded-[12px] p-4" style={{ backgroundColor: C.card }}>
                    <input
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      className="bg-transparent border-none focus:ring-0 w-full text-[17px] text-white placeholder:text-white/20 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] text-white/50">CVV</label>
                  <div className="bg-iosCard rounded-[12px] p-4" style={{ backgroundColor: C.card }}>
                    <input
                      placeholder="123"
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="bg-transparent border-none focus:ring-0 w-full text-[17px] text-white placeholder:text-white/20 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] text-white/50">CPF do Titular</label>
                <div className="bg-iosCard rounded-[12px] p-4" style={{ backgroundColor: C.card }}>
                  <input
                    placeholder="000.000.000-00"
                    value={cardCpf}
                    onChange={(e) => setCardCpf(formatCpf(e.target.value))}
                    maxLength={14}
                    className="bg-transparent border-none focus:ring-0 w-full text-[17px] text-white placeholder:text-white/20 outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP: PIX QR ═══ */}
          {step === "pix_qr" && (
            <motion.div key="pix_qr" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5 text-center">
              <p className="text-sm text-white/50">
                Escaneie o QR Code ou copie o código PIX
              </p>

              {pixQrBase64 && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-[20px]">
                    <img src={`data:image/png;base64,${pixQrBase64}`} alt="PIX QR Code" className="w-48 h-48" />
                  </div>
                </div>
              )}

              {pixCode && (
                <div className="space-y-2">
                  <div
                    className="p-3 text-xs break-all font-mono max-h-20 overflow-y-auto rounded-[14px] text-white/50"
                    style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
                  >
                    {pixCode}
                  </div>
                  <button
                    className="w-full py-3 font-semibold text-[14px] flex items-center justify-center gap-2 rounded-[50px] text-white active:opacity-80 transition-opacity"
                    style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
                    onClick={copyPix}
                  >
                    {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar código PIX</>}
                  </button>
                </div>
              )}

              <p className="text-xs text-white/30">
                Após o pagamento, seu Premium será ativado automaticamente.
              </p>

              <button
                className="w-full py-3 font-medium text-[14px] text-primary active:opacity-80 transition-opacity"
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
                <h2 className="text-2xl font-bold text-white">
                  Premium Ativado! 🎉
                </h2>
                <p className="text-sm mt-2 text-white/50">
                  Seu plano foi ativado com sucesso
                </p>
              </div>

              <div
                className="p-4 text-left space-y-2 rounded-[20px]"
                style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5" style={{ color: C.blue }} />
                  <span className="font-semibold text-[15px] text-white">Plano {plan.title}</span>
                </div>
                <p className="text-[13px] text-white/50">
                  Valor: {priceFormatted}
                </p>
              </div>

              <button
                className="w-full py-3.5 font-bold text-[15px] flex items-center justify-center gap-2 rounded-[50px] text-white"
                style={{ backgroundColor: C.blue }}
                onClick={() => navigate("/analysis")}
              >
                Começar a usar <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed bottom button (method & card_form steps) */}
      {(step === "method" || step === "card_form") && (
        <div className="fixed bottom-0 left-0 right-0 pt-4 pb-8 z-50" style={{ background: "#000000", boxShadow: "0 -8px 20px rgba(0, 0, 0, 0.5)" }}>
          <div className="max-w-md mx-auto px-4 flex flex-col gap-4">
            <button
              className="w-full bg-white text-primary font-bold h-[54px] rounded-[14px] flex items-center justify-center gap-1 active:opacity-90 transition-opacity text-[17px] shadow-lg disabled:opacity-50"
              style={{ backgroundColor: "#ffffff", color: C.blue }}
              disabled={step === "method" ? (!paymentMethod || loading) : loading}
              onClick={() => {
                if (step === "method") {
                  // Use saved method if selected
                  if (selectedSavedMethod) {
                    const savedMethod = savedMethods.find(m => m.id === selectedSavedMethod);
                    if (savedMethod?.type === "pix") {
                      handlePixPayment();
                    } else {
                      setStep("card_form");
                    }
                    return;
                  }
                  if (paymentMethod === "pix") handlePixPayment();
                  else setStep("card_form");
                } else {
                  handleCardPayment();
                }
              }}
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
              ) : (
                <>Pagar {priceFormatted} <ArrowRight className="w-5 h-5 ml-1" /></>
              )}
            </button>
            {/* Home indicator */}
            <div className="h-[5px] w-[134px] bg-white/30 rounded-full mx-auto" />
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      <AnimatePresence>
        {showAddMethod && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
            onClick={() => setShowAddMethod(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-t-[24px] p-6 pb-10"
              style={{ backgroundColor: C.card }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-bold text-white">Adicionar Método</h2>
                <button
                  onClick={() => setShowAddMethod(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <span className="text-white/60 text-[18px]" style={{ fontFamily: "material-symbols-outlined" }}>close</span>
                </button>
              </div>

              {/* Payment Options */}
              <div className="space-y-3">
                {/* PIX Option */}
                <button
                  className="w-full flex items-center p-4 rounded-[16px] gap-4 active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: "rgba(79, 110, 247, 0.1)", border: `1px solid ${C.blue}30` }}
                  onClick={() => {
                    // Save PIX method
                    const newMethod: SavedPaymentMethod = {
                      id: `pix_${Date.now()}`,
                      type: "pix",
                      email: user?.email || "pix@email.com",
                    };
                    setSavedMethods([...savedMethods, newMethod]);
                    setPaymentMethod("pix");
                    setSelectedSavedMethod(newMethod.id);
                    setShowAddMethod(false);
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: C.pixGreen }}>
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold text-[16px]">PIX</p>
                    <p className="text-white/50 text-[13px]">Pagamento instantâneo</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/40" />
                </button>

                {/* Credit Card Option */}
                <button
                  className="w-full flex items-center p-4 rounded-[16px] gap-4 active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: "rgba(79, 110, 247, 0.1)", border: `1px solid ${C.blue}30` }}
                  onClick={() => {
                    setShowAddMethod(false);
                    setStep("card_form");
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold text-[16px]">Cartão de Crédito</p>
                    <p className="text-white/50 text-[13px]">Visa, Mastercard, Elo, etc</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/40" />
                </button>
              </div>

              {/* Security note */}
              <p className="text-center text-white/30 text-[12px] mt-6 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Seus dados são criptografados e seguros
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
