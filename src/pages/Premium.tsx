import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Crown, Check, ArrowLeft, Sparkles, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const COLORS = {
  bg: "#0D0D14",
  card: "#13131F",
  blue: "#4F6EF7",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.5)",
  textTertiary: "rgba(255,255,255,0.3)",
  border: "rgba(255,255,255,0.06)",
};

export default function Premium() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isPremium, expiresAt, planType } = usePremiumStatus();

  const handleSubscribe = (planId: PlanType) => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(`/checkout?plan=${planId}`);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("pt-BR").format(d);
  };

  if (isPremium) {
    return (
      <div className="min-h-screen px-6 py-8" style={{ backgroundColor: COLORS.bg }}>
        <div className="max-w-md mx-auto text-center space-y-6">
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${COLORS.blue}15` }}
          >
            <Crown className="w-10 h-10" style={{ color: COLORS.blue }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>Você é Premium!</h1>
          <p style={{ color: COLORS.textSecondary }}>
            Plano: <span className="font-medium" style={{ color: COLORS.textPrimary }}>
              {planType === "yearly" ? "Anual" : "Mensal"}
            </span>
          </p>
          {expiresAt && (
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              Válido até: {formatDate(expiresAt)}
            </p>
          )}
          <Button
            className="w-full"
            style={{ backgroundColor: COLORS.card, color: COLORS.textPrimary, borderRadius: 50, border: `1px solid ${COLORS.border}` }}
            onClick={() => navigate("/analysis")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao app
          </Button>
          <button
            onClick={() => navigate("/cancel-subscription")}
            className="text-[13px] font-medium transition-colors"
            style={{ color: "rgba(255,100,100,0.7)" }}
          >
            Cancelar assinatura
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8" style={{ backgroundColor: COLORS.bg }}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: COLORS.card }}
            onClick={() => navigate("/analysis")}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.textPrimary }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: COLORS.textPrimary }}>Seja Premium</h1>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 py-4"
        >
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${COLORS.blue}, #3B5DE7)` }}
          >
            <Sparkles className="w-8 h-8" style={{ color: COLORS.textPrimary }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
            Desbloqueie todo o potencial
          </h2>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            Análises ilimitadas, resultados detalhados e suporte prioritário.
          </p>
        </motion.div>

        {/* Plan Cards */}
        <div className="space-y-4">
          {(Object.entries(PLAN_CONFIG.PLANS) as [PlanType, typeof PLAN_CONFIG.PLANS[PlanType]][]).map(
            ([key, plan], index) => {
              const isPopular = plan.badge === "Mais Popular";
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div
                    className="relative p-5"
                    style={{
                      backgroundColor: COLORS.card,
                      borderRadius: 20,
                      border: isPopular ? `2px solid ${COLORS.blue}` : `1px solid ${COLORS.border}`,
                    }}
                  >
                    {plan.badge && (
                      <span
                        className="absolute -top-3 left-4 text-xs font-semibold px-3 py-1"
                        style={{
                          backgroundColor: COLORS.blue,
                          color: COLORS.textPrimary,
                          borderRadius: 50,
                        }}
                      >
                        {plan.badge}
                      </span>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>{plan.title}</h3>
                        <p className="text-sm" style={{ color: COLORS.textSecondary }}>{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
                          R$ {plan.price.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-4">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm" style={{ color: COLORS.textSecondary }}>
                          <Check className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.blue }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      className="w-full py-3 font-semibold text-[15px] transition-all"
                      style={{
                        borderRadius: 50,
                        backgroundColor: isPopular ? COLORS.blue : "transparent",
                        color: isPopular ? COLORS.textPrimary : COLORS.blue,
                        border: isPopular ? "none" : `1px solid ${COLORS.blue}`,
                      }}
                      onClick={() => handleSubscribe(key)}
                    >
                      Assinar agora
                    </button>
                  </div>
                </motion.div>
              );
            }
          )}
        </div>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-center pt-2">
          <Lock className="w-3.5 h-3.5" style={{ color: COLORS.textTertiary }} />
          <span className="text-[11px]" style={{ color: COLORS.textTertiary }}>
            Pagamento seguro via Mercado Pago • Cancele quando quiser
          </span>
        </div>
      </div>
    </div>
  );
}
