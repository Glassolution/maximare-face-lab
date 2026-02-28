import { useState } from "react";
import { Check, X, ShieldCheck, Zap, ScanFace, Microscope, Palette, Scissors, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import faceScanHero from "@/assets/face-scan-hero.jpg";
import { logPaywallEvent, PaywallContext } from "@/lib/paywall";
import { trackEvent } from "@/lib/posthog";
import { CheckoutPremium } from "./CheckoutPremium";
import { PlanConfirmation } from "./PlanConfirmation";

import { PaymentSuccess } from "./PaymentSuccess";

interface PremiumContentProps {
  onClose?: () => void;
  context?: PaywallContext;
  isModal?: boolean;
}

export default function PremiumContent({ onClose, context, isModal = false }: PremiumContentProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [step, setStep] = useState<'landing' | 'confirmation' | 'payment' | 'success'>('landing');
  const [loading, setLoading] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const handleFinalRedirect = async () => {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        navigate('/profile', { state: { premiumActivated: true } }); 
    } else {
        // Guest User - Trigger Password Reset so they can set their password
        if (successEmail) {
            const { error } = await supabase.auth.resetPasswordForEmail(successEmail, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            
            if (error) {
                console.error("Error sending reset email:", error);
                // Don't block success flow, just warn
                toast.success("Pagamento aprovado! Faça login para acessar.");
            } else {
                toast.success("Verifique seu e-mail para definir sua senha e acessar sua conta!");
            }
            navigate('/login');
        } else {
            navigate('/login');
        }
    }
  };

  const handleSuccess = (email?: string) => {
    setSuccessEmail(email);
    setStep('success');
  };

  if (step === 'success') {
    return (
      <PaymentSuccess onContinue={handleFinalRedirect} />
    );
  }

  if (step === 'payment') {
    const price = PLAN_CONFIG.PLANS[selectedPlan].price;
    return (
      <div className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full h-full max-w-md bg-background-light dark:bg-background-dark relative shadow-2xl">
            <CheckoutPremium 
                plan={selectedPlan} 
                price={price} 
                onSuccess={handleSuccess}
                onCancel={() => setStep('confirmation')}
            />
        </div>
      </div>
    );
  }

  if (step === 'confirmation') {
      return (
        <div className={`fixed inset-0 z-50 bg-background-light dark:bg-background-dark overflow-hidden`}>
            <PlanConfirmation 
                selectedPlan={selectedPlan}
                onConfirm={() => {
                    setStep('payment');
                }}
                onBack={() => setStep('landing')}
            />
        </div>
      );
  }

  // LANDING PAGE (Original UI)
  const getDynamicTitle = () => {
    if (!context) return "Desbloqueie acesso\nilimitado";
    
    switch (context.trigger) {
      case 'analysis_completed':
      case 'report_view':
        return "Relatório Completo +\nPlano Detalhado";
      case 'feature_locked':
        return "Recurso Premium";
      case 'app_open':
        return "Plano Personalizado";
      case 'periodic_force':
        return "Desbloqueie seu Potencial";
      default:
        return "Acesso Ilimitado";
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await logPaywallEvent(session?.user?.id || 'guest', 'checkout_started', { plan: selectedPlan });

      // PostHog: track checkout started
      trackEvent(session?.user?.id || 'anonymous', 'checkout_started', {
        plan: selectedPlan,
        trigger: context?.trigger,
        price: PLAN_CONFIG.PLANS[selectedPlan].price,
      });

      // Change to confirmation step
      setStep('confirmation');

    } catch (error) {
      console.error('Subscription error:', error);
      toast.error("Erro ao iniciar assinatura.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { name: "Análises Ilimitadas", icon: <Zap className="w-3 h-3 text-orange-400" />, free: false, pro: true },
    { name: "Análise Jaw Max", icon: <ScanFace className="w-3 h-3 text-zinc-400" />, free: false, pro: true },
    { name: "Maximare Ultimate", icon: <Microscope className="w-3 h-3 text-zinc-400" />, free: false, pro: true },
    { name: "Análise de Cores", icon: <Palette className="w-3 h-3 text-zinc-400" />, free: false, pro: true },
    { name: "Plano Glow Up", icon: <Scissors className="w-3 h-3 text-zinc-400" />, free: false, pro: true },
    { name: "Sem Anúncios", icon: <Ban className="w-3 h-3 text-red-400" />, free: false, pro: true },
  ];

  return (
    <div className={`bg-black text-white flex flex-col relative overflow-hidden ${isModal ? 'h-full w-full' : 'h-[100dvh]'}`}>
      
      {/* Background Image - Balanced height */}
      <div className="absolute inset-0 z-0 h-[180px] sm:h-[50vh]">
        <img 
          src={faceScanHero} 
          alt="Face Scan" 
          className="w-full h-full object-cover opacity-60 mask-image-gradient"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/80 to-black" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center px-5 sm:px-6 pt-5 sm:pt-6">
        <button
          onClick={handleClose}
          className="fixed top-4 right-4 z-[9999] w-11 h-11 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <button className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-colors">
          Restaurar
        </button>
      </div>

      {/* Content - Balanced spacing */}
      <div className="relative z-10 flex-1 flex flex-col px-5 sm:px-6 pb-4 sm:pb-6 overflow-y-auto no-scrollbar">
        
        {/* Spacer to push content below image */}
        <div className="shrink-0 h-[140px] sm:h-[25vh]" />

        {/* Hero Text - Balanced */}
        <div className="text-center mb-4 sm:mb-6 shrink-0">
          <h1 className="text-[22px] sm:text-2xl font-bold leading-tight whitespace-pre-line drop-shadow-2xl text-white">
            {getDynamicTitle()}
          </h1>
        </div>

        {/* Comparison Table - Balanced */}
        <div className="bg-zinc-900/90 backdrop-blur-md rounded-3xl p-4 sm:p-5 mb-4 sm:mb-6 border border-zinc-800/50 shadow-xl shrink-0">
          <div className="grid grid-cols-[1.5fr,0.8fr,0.8fr] gap-3 mb-4 text-[10px] font-bold uppercase tracking-widest text-center items-center opacity-80">
            <div className="text-left pl-1 text-zinc-400">SERVIÇO</div>
            <div className="text-zinc-500">GRÁTIS</div>
            <div className="bg-blue-500 text-white px-2 py-0.5 rounded-full mx-auto w-fit shadow-lg shadow-blue-500/20">PRO</div>
          </div>
          
          <div className="space-y-3.5">
            {features.map((feature, i) => (
              <div key={i} className="grid grid-cols-[1.5fr,0.8fr,0.8fr] gap-3 items-center text-center group">
                <div className="flex items-center gap-2.5 text-[13px] font-semibold text-left text-zinc-200">
                  <span className="opacity-80 group-hover:opacity-100 transition-opacity p-1 bg-white/5 rounded-md">{feature.icon}</span>
                  <span className="leading-tight truncate">{feature.name}</span>
                </div>
                <div className="flex justify-center opacity-50">
                  {feature.free ? (
                    <Check className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-500/30" />
                  )}
                </div>
                <div className="flex justify-center">
                  {feature.pro ? (
                    <div className="bg-blue-500/10 p-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5 text-blue-400" strokeWidth={3} />
                    </div>
                  ) : (
                    <X className="w-3.5 h-3.5 text-red-500/30" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plans Selection - Balanced Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4 sm:mb-6 shrink-0">
          {(['weekly', 'monthly', 'yearly'] as PlanType[]).map((key) => {
            const plan = PLAN_CONFIG.PLANS[key];
            const isSelected = selectedPlan === key;
            
            return (
              <div 
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`
                  relative rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center cursor-pointer border transition-all duration-300 group
                  ${isSelected 
                    ? 'bg-zinc-900 border-blue-500 ring-1 ring-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.02]' 
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'}
                `}
              >
                {key === 'yearly' && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full z-10 uppercase whitespace-nowrap shadow-lg ring-2 ring-black">
                    -50% OFF
                  </div>
                )}
                
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-0.5 shadow-lg ring-2 ring-black">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
                
                <span className={`text-[10px] uppercase tracking-wider mb-1.5 font-bold transition-colors ${isSelected ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                  {key === 'weekly' ? 'Semana' : key === 'monthly' ? 'Mês' : 'Anual'}
                </span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm sm:text-base font-bold text-white">R${Math.floor(plan.price)}</span>
                  <span className="text-[10px] font-bold text-white/60">,{plan.price.toFixed(2).split('.')[1]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <Button 
          onClick={handleSubscribe}
          disabled={!!loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-7 text-base font-bold shadow-xl shadow-blue-600/20 mb-2 uppercase tracking-wider transition-all active:scale-[0.98] shrink-0"
        >
          {loading ? 'Processando...' : 'Desbloquear Agora'}
        </Button>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500 shrink-0 pb-4 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-zinc-400" />
            <span>Cancelamento fácil</span>
          </div>
          <span className="text-zinc-700">•</span>
          <button className="hover:text-white transition-colors">Termos de uso</button>
        </div>

      </div>
    </div>
  );
}
