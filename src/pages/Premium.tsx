
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowLeft, ShieldCheck, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIG, PlanType } from "@/config/plans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import faceScanHero from "@/assets/face-scan-hero.jpg";
import { PAYMENT_LINKS, PaymentLinkPlan } from "@/config/paymentLinks";
import { openCheckout } from "@/lib/openCheckout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Premium() {
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    try {
      setLoading(selectedPlan);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Faça login para continuar");
        navigate("/login");
        return;
      }

      // Get the correct payment link
      const paymentLink = PAYMENT_LINKS[selectedPlan as PaymentLinkPlan];
      
      if (!paymentLink) {
        toast.error("Plano indisponível no momento");
        return;
      }

      const success = openCheckout(paymentLink, selectedPlan);

      if (success) {
        // Show confirmation modal
        setShowConfirmModal(true);
      }

    } catch (error) {
      console.error(error);
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  const handlePaymentConfirm = () => {
    setShowConfirmModal(false);
    // Here we could trigger a status check or just return to app
    toast.success("Pagamento em processamento. Seu acesso será liberado em breve!");
    navigate("/profile"); // Or back to results
  };

  const features = [
    { name: "Análise Jaw Max", icon: "🗿" },
    { name: "Análise Gym Max", icon: "💪" },
    { name: "Análise de Cores", icon: "🎨" },
    { name: "Análise Capilar", icon: "✂️" },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={faceScanHero} 
          alt="Face Scan" 
          className="w-full h-[60vh] object-cover opacity-60 mask-image-gradient"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/20 backdrop-blur-md">
          <X className="w-6 h-6 text-white" />
        </button>
        <button className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium">
          Restaurar
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col px-5 pt-4 pb-8">
        
        <div className="flex-1" />

        {/* Hero Text */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold leading-tight">
            Desbloqueie acesso<br />ilimitado
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
                  <X className="w-4 h-4 text-red-500/50" />
                </div>
                <div className="flex justify-center">
                  <Check className="w-4 h-4 text-blue-500" />
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
      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white w-[90%] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Pagamento iniciado</DialogTitle>
            <DialogDescription className="text-center text-zinc-400">
              Complete o pagamento no Mercado Pago e clique abaixo para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-center text-zinc-500">
              Seu acesso Premium será liberado automaticamente assim que o pagamento for confirmado.
            </p>
          </div>
          <DialogFooter className="flex-col sm:justify-center gap-2">
            <Button 
              onClick={handlePaymentConfirm} 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              Já paguei
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowConfirmModal(false)}
              className="w-full text-zinc-400 hover:text-white"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
