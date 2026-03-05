import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type PaymentStatus = "approved" | "pending" | "failure" | "loading";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>("loading");

  useEffect(() => {
    // MP redirects back with ?status=approved|pending|failure|null
    // or ?preapproval_id=xxx
    const mpStatus = searchParams.get("status");
    const preapprovalId = searchParams.get("preapproval_id");

    if (mpStatus === "approved" || mpStatus === "authorized") {
      setStatus("approved");
      // Refresh profile to pick up new premium status
      setTimeout(() => refreshProfile(), 2000);
    } else if (mpStatus === "pending" || mpStatus === "in_process") {
      setStatus("pending");
    } else if (mpStatus === "failure" || mpStatus === "rejected" || mpStatus === "null") {
      setStatus("failure");
    } else if (preapprovalId) {
      // Subscription created, likely pending authorization
      setStatus("pending");
    } else {
      setStatus("pending");
    }
  }, [searchParams, refreshProfile]);

  const configs: Record<Exclude<PaymentStatus, "loading">, {
    icon: React.ReactNode;
    title: string;
    description: string;
    action: string;
    route: string;
    variant: "default" | "outline";
  }> = {
    approved: {
      icon: <CheckCircle2 className="w-16 h-16 text-primary" />,
      title: "Pagamento aprovado!",
      description: "Seu plano Premium já está ativo. Aproveite todas as funcionalidades!",
      action: "Começar a usar",
      route: "/analysis",
      variant: "default",
    },
    pending: {
      icon: <Clock className="w-16 h-16 text-accent" />,
      title: "Pagamento pendente",
      description: "Estamos processando seu pagamento. Assim que for confirmado, seu Premium será ativado automaticamente.",
      action: "Voltar ao app",
      route: "/analysis",
      variant: "outline",
    },
    failure: {
      icon: <XCircle className="w-16 h-16 text-destructive" />,
      title: "Pagamento não aprovado",
      description: "Houve um problema com o pagamento. Tente novamente ou escolha outro método.",
      action: "Tentar novamente",
      route: "/premium",
      variant: "default",
    },
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const config = configs[status];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full text-center space-y-6"
      >
        <div className="flex justify-center">{config.icon}</div>
        <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
        <p className="text-muted-foreground">{config.description}</p>
        <Button
          className="w-full"
          variant={config.variant}
          onClick={() => navigate(config.route)}
        >
          {config.action}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
