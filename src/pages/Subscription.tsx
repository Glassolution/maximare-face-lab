import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, ArrowLeft, Loader2, Trophy, BarChart2, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { CheckoutPremium } from "@/components/CheckoutPremium";
import { PLAN_CONFIG } from "@/config/plans";
import { supabase } from "@/integrations/supabase/client";
import { PaymentSuccess } from "@/components/PaymentSuccess";

export default function Subscription() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Map 'annual' to 'yearly' for compatibility with CheckoutPremium
  const rawPlan = searchParams.get("plan") || 'weekly';
  const initialPlan = (rawPlan === 'annual' ? 'yearly' : rawPlan) as 'weekly' | 'monthly' | 'yearly';
  
  const [selectedPlan] = useState(initialPlan);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | undefined>(undefined);

  const PLANS = {
    weekly: {
      name: "Semanal",
      price: "R$ 24,90",
      period: "por semana",
      description: "Ciclo curto de 7 dias",
      features: ["Acesso Imediato ao Relatório Completo", "Garantia de Satisfação"]
    },
    monthly: {
      name: "Mensal",
      price: "R$ 49,90",
      period: "por mês",
      description: "Evolução contínua",
      features: ["Acesso Imediato ao Relatório Completo", "Acompanhamento Mensal"]
    },
    yearly: { // Changed key to match initialPlan normalized value
      name: "Anual",
      price: "R$ 499,90",
      period: "por ano",
      description: "Compromisso total",
      features: ["Acesso Imediato ao Relatório Completo", "Prioridade no Suporte", "Economia de 50%"]
    }
  };

  const currentPlan = PLANS[selectedPlan];
  const price = PLAN_CONFIG.PLANS[selectedPlan].price;

  const handlePaymentStart = () => {
    setShowCheckout(true);
  };

  const handlePaymentSuccess = (email?: string) => {
    setSuccessEmail(email);
    setShowSuccess(true);
  };

  const handleFinalRedirect = () => {
    // Payment was confirmed — always navigate to profile.
    // Never redirect to /login here: the user was authenticated to make the payment,
    // and a stale session check could cause false redirects after token rotation.
    navigate('/profile', { state: { premiumActivated: true } });
  };

  if (showSuccess) {
    return <PaymentSuccess onContinue={handleFinalRedirect} />;
  }

  if (showCheckout) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full h-full max-w-md bg-[#0a0a0a] relative shadow-2xl">
            <CheckoutPremium 
                plan={selectedPlan} 
                price={price} 
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowCheckout(false)}
            />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-zinc-400">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Confirmação do Plano</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Steps */}
      <div className="flex justify-center items-center gap-2 py-6 px-8">
        <div className="flex flex-col items-center gap-1">
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
          <span className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Análise</span>
        </div>
        <div className="h-[2px] flex-1 bg-blue-600/50" />
        <div className="flex flex-col items-center gap-1">
          <div className="h-8 w-8 rounded-full border-2 border-blue-500 flex items-center justify-center relative">
            <div className="h-3 w-3 bg-blue-500 rounded-full" />
          </div>
          <span className="text-[10px] text-blue-500 font-bold tracking-widest uppercase">Plano</span>
        </div>
        <div className="h-[2px] flex-1 bg-zinc-800" />
        <div className="flex flex-col items-center gap-1">
          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
          </div>
          <span className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase">Pagamento</span>
        </div>
      </div>

      <div className="flex-1 px-6 pb-24 space-y-8 max-w-md mx-auto w-full">
        
        {/* Selected Plan Summary */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Você escolheu: {currentPlan.name}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Excelente escolha para maximizar seu potencial estético.
          </p>
        </div>

        {/* Plan Card */}
        <Card className="bg-transparent border-blue-500 border-2 rounded-2xl overflow-hidden relative shadow-[0_0_30px_rgba(37,99,235,0.15)]">
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-white">{currentPlan.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">{currentPlan.description}</p>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-bold text-white">{currentPlan.price}</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{currentPlan.period}</span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              {currentPlan.features.map((feature, i) => (
                <div key={i} className="flex gap-3 items-center text-sm text-zinc-300">
                  <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-blue-500" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Benefits List */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
            O QUE VOCÊ VAI RECEBER:
          </p>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Relatório Biométrico Completo</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Análise detalhada de 42 pontos faciais & índices de simetria.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <BarChart2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Guia de Estratégia IA</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Rotinas personalizadas baseadas em dados para otimização estética.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                <Dumbbell className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Análise Maximare Ultimate</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Recomendações de treino baseadas no seu biotipo.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer / CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent z-50">
        <div className="max-w-md mx-auto space-y-3">
          <Button 
            className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            onClick={handlePaymentStart}
          >
            Continuar para Pagamento <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <p className="text-[10px] text-center text-zinc-500 leading-tight px-4">
            Transação segura criptografada de 256 bits. Ao continuar, você concorda com nossos Termos de Serviço.
          </p>
        </div>
      </div>
    </div>
  );
}
