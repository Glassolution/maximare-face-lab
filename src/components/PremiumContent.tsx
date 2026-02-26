
import { useState } from "react";
import { Check, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import faceScanHero from "@/assets/face-scan-hero.jpg";
import { logPaywallEvent, PaywallContext } from "@/lib/paywall";
import { CheckoutPremium } from "./CheckoutPremium";
import { PlanConfirmation } from "./PlanConfirmation";

interface PremiumContentProps {
  onClose?: () => void;
  context?: PaywallContext;
  isModal?: boolean;
}

export default function PremiumContent({ onClose, context, isModal = false }: PremiumContentProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [step, setStep] = useState<'landing' | 'confirmation' | 'payment'>('landing');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const handleSuccess = async (email?: string) => {
    setStep('landing');
    
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        navigate('/profile', { state: { premiumActivated: true } }); 
    } else {
        // Guest User - Trigger Password Reset so they can set their password
        if (email) {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

  if (step === 'payment') {
    const price = PLAN_CONFIG.PLANS[selectedPlan].price;
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md">
            <Button variant="ghost" onClick={() => setStep('confirmation')} className="mb-4">
                Voltar
            </Button>
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
    { name: "Análises Ilimitadas", icon: "⚡", free: false, pro: true },
    { name: "Análise Jaw Max", icon: "🗿", free: false, pro: true },
    { name: "Análise Maximare Ultimate", icon: "💪", free: false, pro: true },
    { name: "Análise de Cores", icon: "🎨", free: false, pro: true },
    { name: "Análise Capilar", icon: "✂️", free: false, pro: true },
    { name: "Plano Glow Up", icon: "✨", free: false, pro: true },
    { name: "Sem Anúncios", icon: "🚫", free: false, pro: true },
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
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/5">
          <div className="grid grid-cols-[1.5fr,1fr,1fr] gap-2 mb-4 text-xs font-semibold text-center items-center">
            <div className="text-left pl-2 text-zinc-400">Serviço</div>
            <div className="text-zinc-500">GRÁTIS</div>
            <div className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded text-[10px]">PRO</div>
          </div>
          
          <div className="space-y-4">
            {features.map((feature, i) => (
              <div key={i} className="grid grid-cols-[1.5fr,1fr,1fr] gap-2 items-center text-center">
                <div className="flex items-center gap-2 text-sm font-medium text-left">
                  <span className="text-lg">{feature.icon}</span>
                  <span className="text-zinc-200 text-xs">{feature.name}</span>
                </div>
                <div className="flex justify-center">
                  {feature.free ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500/50" />
                  )}
                </div>
                <div className="flex justify-center">
                  {feature.pro ? (
                    <Check className="w-4 h-4 text-blue-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500/50" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plans Selection */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['weekly', 'monthly', 'yearly'] as PlanType[]).map((key) => {
            const plan = PLAN_CONFIG.PLANS[key];
            const isSelected = selectedPlan === key;
            
            return (
              <div 
                key={key}
                onClick={() => setSelectedPlan(key)}
                className={`
                  relative rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer border-2 transition-all
                  ${isSelected 
                    ? 'bg-zinc-800 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                    : 'bg-zinc-900/50 border-transparent hover:bg-zinc-800/80'}
                `}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                
                <span className="text-xs text-zinc-400 mb-1 font-medium">{plan.title}</span>
                <span className="text-sm font-bold text-white mb-0.5">
                  R$ {Math.floor(plan.price)},<span className="text-xs">{plan.price.toFixed(2).split('.')[1]}</span>
                </span>
                <span className="text-[9px] text-zinc-500 leading-tight text-center px-1">
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
          className="w-full bg-blue-500 hover:bg-blue-500/90 text-white rounded-xl py-6 text-lg font-bold shadow-lg shadow-blue-500/20 mb-4"
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
