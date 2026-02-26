
import { useState } from "react";
import { Check, X, ShieldCheck, Zap, ScanFace, Microscope, Palette, Scissors, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import faceScanHero from "@/assets/face-scan-hero.jpg";
import { logPaywallEvent, PaywallContext } from "@/lib/paywall";
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
        return "Quer seu relatório completo +\nplano detalhado?";
      case 'feature_locked':
        return "Esse recurso é Premium.\nAtive para desbloquear.";
      case 'app_open':
        return "Progrida mais rápido:\nplano personalizado.";
      case 'periodic_force':
        return "Desbloqueie seu potencial\nmáximo agora.";
      default:
        return "Desbloqueie acesso\nilimitado";
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await logPaywallEvent(session?.user?.id || 'guest', 'checkout_started', { plan: selectedPlan });
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
    { name: "Análises Ilimitadas", icon: <Zap className="w-4 h-4 text-orange-400" />, free: false, pro: true },
    { name: "Análise Jaw Max", icon: <ScanFace className="w-4 h-4 text-zinc-400" />, free: false, pro: true },
    { name: "Maximare Ultimate", icon: <Microscope className="w-4 h-4 text-zinc-400" />, free: false, pro: true },
    { name: "Análise de Cores", icon: <Palette className="w-4 h-4 text-zinc-400" />, free: false, pro: true },
    { name: "Plano Glow Up", icon: <Scissors className="w-4 h-4 text-zinc-400" />, free: false, pro: true },
    { name: "Sem Anúncios", icon: <Ban className="w-4 h-4 text-red-400" />, free: false, pro: true },
  ];

  return (
    <div className={`bg-black text-white flex flex-col relative overflow-y-auto ${isModal ? 'h-full w-full' : 'h-[100dvh]'}`}>
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0 h-[60vh]">
        <img 
          src={faceScanHero} 
          alt="Face Scan" 
          className="w-full h-full object-cover opacity-60 mask-image-gradient"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/60 to-black" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-4">
        <button onClick={handleClose} className="p-2 rounded-full bg-black/20 backdrop-blur-md">
          <X className="w-6 h-6 text-white" />
        </button>
        <button className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium">
          Restaurar
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-5 pb-8">
        
        <div className="flex-1 min-h-[35dvh]" />

        {/* Hero Text */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold leading-tight whitespace-pre-line">
            {getDynamicTitle()}
          </h1>
        </div>

        {/* Comparison Table */}
        <div className="bg-zinc-900 rounded-3xl p-6 mb-6 border border-zinc-800">
          <div className="grid grid-cols-[1.5fr,1fr,1fr] gap-4 mb-6 text-xs font-bold uppercase tracking-wider text-center items-center">
            <div className="text-left pl-2 text-zinc-500">SERVIÇO</div>
            <div className="text-zinc-600">GRÁTIS</div>
            <div className="bg-blue-600/20 text-blue-500 px-3 py-1 rounded-full text-[10px] mx-auto w-fit">PRO</div>
          </div>
          
          <div className="space-y-5">
            {features.map((feature, i) => (
              <div key={i} className="grid grid-cols-[1.5fr,1fr,1fr] gap-4 items-center text-center group">
                <div className="flex items-center gap-3 text-sm font-bold text-left">
                  <span className="text-lg opacity-80 group-hover:opacity-100 transition-opacity">{feature.icon}</span>
                  <span className="text-white text-xs leading-tight">{feature.name}</span>
                </div>
                <div className="flex justify-center">
                  {feature.free ? (
                    <Check className="w-4 h-4 text-zinc-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-500/30" />
                  )}
                </div>
                <div className="flex justify-center">
                  {feature.pro ? (
                    <Check className="w-4 h-4 text-blue-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500/30" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plans Selection */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(['weekly', 'monthly', 'yearly'] as PlanType[]).map((key) => {
            const plan = PLAN_CONFIG.PLANS[key];
            const isSelected = selectedPlan === key;
            
            return (
              <div 
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`
                  relative rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer border transition-all duration-300
                  ${isSelected 
                    ? 'bg-zinc-900 border-blue-500 ring-1 ring-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'}
                `}
              >
                {key === 'yearly' && (
                  <div className="absolute -top-2.5 right-1/2 translate-x-1/2 bg-blue-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full z-10 uppercase tracking-wider shadow-lg">
                    Economize 20%
                  </div>
                )}
                
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1 shadow-lg shadow-blue-500/50">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                
                <span className={`text-[10px] uppercase tracking-wider mb-2 font-bold ${isSelected ? 'text-blue-400' : 'text-zinc-500'}`}>
                  {plan.title}
                </span>
                <div className="flex items-end gap-0.5 mb-1">
                  <span className="text-lg font-bold text-white">R$ {Math.floor(plan.price)}</span>
                  <span className="text-xs font-bold text-white/80 mb-1">,{plan.price.toFixed(2).split('.')[1]}</span>
                </div>
                <span className="text-[9px] text-zinc-500 font-medium">
                  {key === 'weekly' ? 'semana' : key === 'monthly' ? 'mês' : 'ano'}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <Button 
          onClick={handleSubscribe}
          disabled={!!loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-7 text-base font-bold shadow-xl shadow-blue-600/20 mb-6 uppercase tracking-wide transition-all active:scale-[0.98]"
        >
          {loading ? 'Processando...' : 'Atualizar para Pro'}
        </Button>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500">
          <button className="hover:text-zinc-300">Termos de uso</button>
          <button className="hover:text-zinc-300">Política de Privacidade</button>
          <div className="flex items-center gap-1 text-blue-500/80">
            <ShieldCheck className="w-3 h-3" />
            <span>Cancele a qualquer momento</span>
          </div>
        </div>
        
        <button className="mt-4 flex items-center justify-center gap-2 w-full text-zinc-600 text-xs py-2 border-t border-white/5">
          <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
             <span className="text-[8px]">👮</span>
          </div>
          Suporte Online
        </button>

      </div>
    </div>
  );
}
