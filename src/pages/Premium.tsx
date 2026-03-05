import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { ArrowLeft, Lock, ChevronRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const COLORS = {
  bg: "#0D0D14",
  card: "#13131F",
  blue: "#4F6EF7",
  iconBg: "#1a1a2e",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.5)",
  textTertiary: "rgba(255,255,255,0.3)",
  border: "rgba(255,255,255,0.06)",
};

export default function Premium() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const monthlyPlan = PLAN_CONFIG.PLANS.monthly;
  const yearlyPlan = PLAN_CONFIG.PLANS.yearly;

  if (isPremium) {
    return (
      <div className="min-h-screen px-6 py-8" style={{ backgroundColor: COLORS.bg }}>
        <div className="max-w-md mx-auto text-center space-y-6">
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${COLORS.blue}15` }}
          >
            <span className="text-4xl">♛</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Você é Premium!</h1>
          <p style={{ color: COLORS.textSecondary }}>
            Plano: <span className="font-medium text-white">
              {planType === "yearly" ? "Anual" : "Mensal"}
            </span>
          </p>
          {expiresAt && (
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              Válido até: {formatDate(expiresAt)}
            </p>
          )}
          <button
            className="w-full py-3 font-semibold text-[15px] flex items-center justify-center gap-2"
            style={{ backgroundColor: COLORS.card, color: COLORS.textPrimary, borderRadius: 50, border: `1px solid ${COLORS.border}` }}
            onClick={() => navigate("/analysis")}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao app
          </button>
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-2">
        <button
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-bold text-white">Seja Premium</h1>
      </div>

      <div className="flex-1 px-5 pb-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 pt-6 pb-8"
        >
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: COLORS.iconBg }}
          >
            <span className="text-3xl" style={{ color: COLORS.blue }}>✦</span>
          </div>
          <h2 className="text-[22px] font-extrabold text-white leading-tight">
            Desbloqueie todo o potencial
          </h2>
          <p className="text-sm leading-relaxed mx-auto max-w-[280px]" style={{ color: COLORS.textSecondary }}>
            Análises ilimitadas, resultados detalhados e suporte prioritário.
          </p>
        </motion.div>

        {/* Monthly Plan — Featured */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div
            className="relative p-5 pb-4"
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 24,
              border: `2px solid ${COLORS.blue}`,
            }}
          >
            {/* Crown + Badge row */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">♛</span>
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${COLORS.blue}20`, color: COLORS.blue }}
              >
                • Mais Popular
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-3">Mensal</h3>

            {/* Features */}
            <ul className="space-y-2.5 mb-5">
              {monthlyPlan.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: COLORS.textSecondary }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="12" fill={COLORS.blue} fillOpacity="0.15" />
                    <path d="M8 12.5L10.5 15L16 9.5" stroke={COLORS.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* Price + CTA row */}
            <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <div>
                <span className="text-[11px] font-medium" style={{ color: COLORS.textTertiary }}>Investimento</span>
                <p className="text-white font-bold text-[15px]">R$ {monthlyPlan.price.toFixed(2).replace(".", ",")}/mês</p>
              </div>
              <button
                className="flex items-center gap-1.5 px-5 py-2.5 font-semibold text-[14px] transition-all active:scale-95"
                style={{
                  borderRadius: 50,
                  backgroundColor: COLORS.blue,
                  color: "#FFFFFF",
                }}
                onClick={() => handleSubscribe("monthly")}
              >
                Assinar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Other Plans Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[13px] font-semibold mb-3" style={{ color: COLORS.textTertiary }}>
            Outros planos
          </p>

          {/* Yearly Plan — Compact */}
          <button
            className="w-full flex items-center gap-3.5 p-4 transition-all active:scale-[0.98]"
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 20,
              border: `1px solid ${COLORS.border}`,
            }}
            onClick={() => handleSubscribe("yearly")}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: COLORS.iconBg }}
            >
              <span className="text-lg">♛</span>
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-[15px] font-bold text-white">Anual</h4>
              <p className="text-[12px] mt-0.5" style={{ color: COLORS.textSecondary }}>
                R$ {yearlyPlan.price.toFixed(2).replace(".", ",")}/ano · economize 67%
              </p>
            </div>
            <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.textTertiary }} />
          </button>
        </motion.div>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-2 text-center pt-8 pb-2">
          <Lock className="w-3.5 h-3.5" style={{ color: COLORS.textTertiary }} />
          <span className="text-[11px]" style={{ color: COLORS.textTertiary }}>
            Pagamento seguro • Cancele quando quiser
          </span>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 pt-1 pb-4">
          <a href="#" className="text-[11px] underline" style={{ color: COLORS.textTertiary }}>Termos de uso</a>
          <a href="#" className="text-[11px] underline" style={{ color: COLORS.textTertiary }}>Privacidade</a>
        </div>
      </div>
    </div>
  );
}
