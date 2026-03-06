import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { ArrowLeft, Lock, ChevronRight, ArrowRight, Sparkles, CheckCircle2, Mail, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COLORS = {
  bg: "#0D0D14",
  card: "#13131F",
  blue: "#4F6EF7",
  iconBg: "#1a1a2e",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.5)",
  textTertiary: "rgba(255,255,255,0.3)",
  border: "rgba(255,255,255,0.06)",
  successGreen: "#00E676",
};

export default function Premium() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, expiresAt, planType } = usePremiumStatus();
  const [showSignup, setShowSignup] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const handleSubscribe = (planId: PlanType) => {
    if (!user) {
      setPendingPlan(planId);
      setShowSignup(true);
      return;
    }
    navigate(`/checkout?plan=${planId}`);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // Auto-confirmed, user is now logged in — go to checkout
      navigate(`/checkout?plan=${pendingPlan}`);
    } catch (err: any) {
      setSignupError(err?.message || "Erro ao criar conta.");
    } finally {
      setSignupLoading(false);
    }
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: COLORS.bg, fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-6 py-4 flex items-center gap-4"
        style={{ backgroundColor: "rgba(13, 13, 20, 0.8)", backdropFilter: "blur(12px)" }}
      >
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white">Seja Premium</h1>
      </header>

      <main className="flex-1 px-6 pb-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 mb-10 flex flex-col items-center text-center"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg mb-6"
            style={{ backgroundColor: COLORS.blue, boxShadow: `0 10px 40px ${COLORS.blue}40` }}
          >
            <Sparkles className="text-white text-3xl w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold mb-3 tracking-tight text-white">
            Desbloqueie todo o potencial
          </h2>
          <p className="text-slate-400 max-w-[280px] leading-relaxed">
            Análises ilimitadas, resultados detalhados e suporte prioritário.
          </p>
        </motion.div>

        {/* Monthly Plan — Featured */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div
            className="rounded-2xl p-7 relative overflow-hidden transition-transform active:scale-[0.98] cursor-pointer"
            style={{
              backgroundColor: COLORS.blue,
              boxShadow: `0 10px 40px ${COLORS.blue}40`,
            }}
            onClick={() => handleSubscribe("monthly")}
          >
            {/* Crown + Badge row */}
            <div className="flex justify-between items-start mb-8">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#000" }}
              >
                <span className="text-xl">♛</span>
              </div>
              <div
                className="px-3 py-1.5 rounded-full"
                style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">• Mais Popular</span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-3xl font-bold text-white mb-6">Mensal</h3>

            {/* Features */}
            <ul className="space-y-4">
              {monthlyPlan.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-white font-medium">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* Price + CTA row */}
            <div className="flex items-center justify-between mt-10">
              <div className="flex flex-col">
                <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Investimento</span>
                <span className="text-2xl font-extrabold text-white">
                  R$ {monthlyPlan.price.toFixed(2).replace(".", ",")}
                  <span className="text-sm font-normal opacity-80">/mês</span>
                </span>
              </div>
              <button
                className="flex items-center gap-2 px-6 py-3.5 rounded-full font-bold transition-transform hover:scale-105 active:scale-95 shadow-lg"
                style={{
                  backgroundColor: "#000",
                  color: "#fff",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubscribe("monthly");
                }}
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
          <h3 className="text-white/60 font-semibold text-sm uppercase tracking-widest px-1 mb-4">
            Outros planos
          </h3>

          {/* Yearly Plan — Compact */}
          <button
            className="w-full flex items-center gap-4 p-5 rounded-xl transition-all active:scale-[0.98] group"
            style={{
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
            onClick={() => handleSubscribe("yearly")}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: COLORS.iconBg }}
            >
              <span className="text-primary text-2xl" style={{ color: COLORS.blue }}>♛</span>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-white">Anual</h4>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-sm text-white/60">
                R$ {yearlyPlan.price.toFixed(2).replace(".", ",")}/ano
                <span className="font-bold ml-1" style={{ color: COLORS.successGreen }}>· economize 67%</span>
              </p>
            </div>
          </button>
        </motion.div>

        {/* Trust footer */}
        <footer className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-white/30 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Pagamento seguro • Cancele quando quiser</span>
          </div>
          <div className="mt-4 flex justify-center gap-4 text-[10px] text-white/20 uppercase tracking-widest font-bold">
            <a href="#" className="hover:text-primary transition-colors">Termos de uso</a>
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
          </div>
        </footer>
      </main>

      {/* Inline Signup Overlay */}
      <AnimatePresence>
        {showSignup && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-6"
            style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-2xl p-7"
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
            >
              <h2 className="text-xl font-bold text-white mb-1">Criar sua conta</h2>
              <p className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>
                Para finalizar sua assinatura
              </p>

              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textTertiary }} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Seu melhor e-mail"
                    className="bg-black/40 border-white/10 pl-10 text-sm text-white placeholder:text-white/30"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textTertiary }} />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Crie uma senha"
                    className="bg-black/40 border-white/10 pl-10 text-sm text-white placeholder:text-white/30"
                  />
                </div>

                {signupError && <p className="text-xs text-red-400">{signupError}</p>}

                <Button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full font-bold text-sm text-white"
                  style={{ backgroundColor: COLORS.blue, borderRadius: 50, height: 48 }}
                >
                  {signupLoading ? "Criando conta..." : "Continuar para pagamento →"}
                </Button>
              </form>

              <p className="text-center mt-4 text-[11px]" style={{ color: COLORS.textTertiary }}>
                Sem spam. Cancele quando quiser.
              </p>

              <button
                onClick={() => setShowSignup(false)}
                className="w-full mt-3 text-center text-xs font-medium"
                style={{ color: COLORS.textSecondary }}
              >
                Voltar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
