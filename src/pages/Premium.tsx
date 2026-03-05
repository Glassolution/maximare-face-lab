import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Check, ArrowLeft, Sparkles, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Premium() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const isPremium = profile?.is_premium || profile?.subscription_status === "active";

  const handleSubscribe = (planId: PlanType) => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(`/checkout?plan=${planId}`);
  };

  if (isPremium) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Você é Premium!</h1>
          <p className="text-muted-foreground">
            Plano: <span className="font-medium text-foreground">{profile?.plan_type === "yearly" ? "Anual" : "Mensal"}</span>
          </p>
          {profile?.subscription_expires_at && (
            <p className="text-sm text-muted-foreground">
              Válido até: {new Date(profile.subscription_expires_at).toLocaleDateString("pt-BR")}
            </p>
          )}
          <Button variant="outline" onClick={() => navigate("/analysis")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao app
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={() => navigate("/cancel-subscription")}>
            Cancelar assinatura
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/analysis")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Seja Premium</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 py-4"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Desbloqueie todo o potencial</h2>
          <p className="text-muted-foreground text-sm">
            Análises ilimitadas, resultados detalhados e suporte prioritário.
          </p>
        </motion.div>

        <div className="space-y-4">
          {(Object.entries(PLAN_CONFIG.PLANS) as [PlanType, typeof PLAN_CONFIG.PLANS[PlanType]][]).map(
            ([key, plan], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`relative p-5 border-2 transition-all ${
                    plan.badge === "Mais Popular"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{plan.title}</h3>
                      <p className="text-muted-foreground text-sm">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-foreground">
                        R$ {plan.price.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.badge === "Mais Popular" ? "default" : "outline"}
                    onClick={() => handleSubscribe(key)}
                  >
                    Assinar agora
                  </Button>
                </Card>
              </motion.div>
            )
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
          <Shield className="w-4 h-4" />
          <span>Pagamento seguro via Mercado Pago • Cancele quando quiser</span>
        </div>
      </div>
    </div>
  );
}
