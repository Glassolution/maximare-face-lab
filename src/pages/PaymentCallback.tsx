import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Check, XCircle, Clock, ArrowRight, Loader2, Crown } from "lucide-react";
import { motion } from "framer-motion";

type PaymentStatus = "approved" | "pending" | "failure" | "loading";

const C = {
  bg: "#0D0D14",
  card: "#13131F",
  blue: "#4F6EF7",
  text: "#FFFFFF",
  sub: "rgba(255,255,255,0.5)",
  dim: "rgba(255,255,255,0.3)",
  border: "rgba(255,255,255,0.06)",
  red: "#EF4444",
  amber: "#F59E0B",
};

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>("loading");

  useEffect(() => {
    const mpStatus = searchParams.get("status");
    const preapprovalId = searchParams.get("preapproval_id");

    if (mpStatus === "approved" || mpStatus === "authorized") {
      setStatus("approved");
      setTimeout(() => refreshProfile(), 2000);
    } else if (mpStatus === "pending" || mpStatus === "in_process") {
      setStatus("pending");
    } else if (mpStatus === "failure" || mpStatus === "rejected" || mpStatus === "null") {
      setStatus("failure");
    } else if (preapprovalId) {
      setStatus("pending");
    } else {
      setStatus("pending");
    }
  }, [searchParams, refreshProfile]);

  // Auto redirect on success
  useEffect(() => {
    if (status !== "approved") return;
    const t = setTimeout(() => navigate("/analysis"), 3000);
    return () => clearTimeout(t);
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.blue }} />
      </div>
    );
  }

  const configs: Record<Exclude<PaymentStatus, "loading">, {
    icon: React.ReactNode;
    title: string;
    description: string;
    action: string;
    route: string;
    color: string;
  }> = {
    approved: {
      icon: (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${C.blue}20` }}
        >
          <Check className="w-12 h-12" style={{ color: C.blue }} />
        </motion.div>
      ),
      title: "Premium Ativado! 🎉",
      description: "Seu plano foi ativado com sucesso. Aproveite todas as funcionalidades!",
      action: "Começar a usar",
      route: "/analysis",
      color: C.blue,
    },
    pending: {
      icon: (
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: `${C.amber}20` }}>
          <Clock className="w-12 h-12" style={{ color: C.amber }} />
        </div>
      ),
      title: "Pagamento pendente",
      description: "Estamos processando seu pagamento. Seu Premium será ativado automaticamente.",
      action: "Voltar ao app",
      route: "/analysis",
      color: C.amber,
    },
    failure: {
      icon: (
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: `${C.red}20` }}>
          <XCircle className="w-12 h-12" style={{ color: C.red }} />
        </div>
      ),
      title: "Pagamento não aprovado",
      description: "Houve um problema com o pagamento. Tente novamente ou escolha outro método.",
      action: "Tentar novamente",
      route: "/premium",
      color: C.red,
    },
  };

  const config = configs[status];

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: C.bg }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full text-center space-y-6"
      >
        <div className="flex justify-center">{config.icon}</div>
        <h1 className="text-2xl font-bold" style={{ color: C.text }}>{config.title}</h1>
        <p className="text-sm" style={{ color: C.sub }}>{config.description}</p>

        {status === "approved" && (
          <div
            className="p-4 flex items-center gap-3"
            style={{ backgroundColor: C.card, borderRadius: 20, border: `1px solid ${C.border}` }}
          >
            <Crown className="w-5 h-5" style={{ color: C.blue }} />
            <span className="font-semibold" style={{ color: C.text }}>Plano Premium Ativo</span>
          </div>
        )}

        <button
          className="w-full py-3.5 font-bold text-[15px] flex items-center justify-center gap-2"
          style={{
            backgroundColor: status === "failure" ? C.red : C.blue,
            color: C.text,
            borderRadius: 50,
          }}
          onClick={() => navigate(config.route)}
        >
          {config.action}
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
