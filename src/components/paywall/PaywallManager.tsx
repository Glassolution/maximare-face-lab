import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisLimit } from "@/hooks/useAnalysisLimit";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PaywallManagerProps {
  children: React.ReactNode;
  trigger: string;
}

export function PaywallManager({ children }: PaywallManagerProps) {
  const { user } = useAuth();
  const { isPremium } = useAnalysisLimit();
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly' | 'annual'>('annual');
  const navigate = useNavigate();

  // Session State (Memory only)
  const [sessionCount, setSessionCount] = useState(0);
  const [lastShownAt, setLastShownAt] = useState<number>(0);

  // Constants
  const COOLDOWN_MS = 600000; // 10 minutes
  const MAX_PER_SESSION = 1;

  const triggerPaywall = () => {
    if (isPremium) return;
    if (sessionCount >= MAX_PER_SESSION) return;
    
    const now = Date.now();
    if (now - lastShownAt < COOLDOWN_MS) return;

    setShowPaywall(true);
    setLastShownAt(now);
    setSessionCount(prev => prev + 1);
  };

  useEffect(() => {
    if (!user || isPremium) return;
    const timer = setTimeout(() => triggerPaywall(), 2000);
    return () => clearTimeout(timer);
  }, [user, isPremium]);

  const handleSubscribe = () => {
      setShowPaywall(false);
      navigate(`/subscription?plan=${selectedPlan}`); 
  };
  
  return (
    <>
      {children}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="w-[90%] max-w-[380px] p-6 rounded-[2rem] border border-white/10 bg-[#0a0a0a] text-white backdrop-blur-xl shadow-2xl overflow-y-auto max-h-[90vh]">
          {/* Close Button Hack for Mobile */}
          <DialogTitle className="sr-only">Desbloqueie seu Potencial</DialogTitle>
          <DialogDescription className="sr-only">Escolha um plano para acessar todos os recursos.</DialogDescription>
          
          <div className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50">
             {/* The default DialogClose is already there, but sometimes hidden by custom styles. 
                 Radix UI DialogContent includes a close button by default. 
                 We just need to ensure z-index and positioning are correct if it's being covered. 
                 Actually, Shadcn UI DialogContent includes a Close button. 
                 Let's check if we need to manually add one or style the existing one.
                 Shadcn's DialogContent usually has a Close button in the top right.
                 If it's not clickable, it might be z-index issues or overflow hidden.
                 Since we added overflow-y-auto, it should be fine inside.
                 But let's make sure content doesn't overlap it.
             */}
          </div>

          {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Desbloqueie seu Potencial</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Selecione um protocolo científico para liberar sua análise biométrica completa.
          </p>
        </div>

        {/* Plan Selection */}
        <div className="space-y-3 mb-6">
          {/* Weekly Plan */}
          <div 
            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              selectedPlan === 'weekly' 
                ? "border-blue-600 bg-blue-600/5 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            onClick={() => setSelectedPlan('weekly')}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Semanal</h3>
                <p className="text-[10px] text-zinc-400">Teste rápido de 7 dias</p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-lg">R$ 24,90</span>
              </div>
            </div>
          </div>

          {/* Monthly Plan */}
          <div 
            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              selectedPlan === 'monthly' 
                ? "border-blue-600 bg-blue-600/5 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Mensal</h3>
                <p className="text-[10px] text-zinc-400">Evolução contínua</p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-lg">R$ 49,90</span>
              </div>
            </div>
          </div>

          {/* Annual Plan */}
          <div 
            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              selectedPlan === 'annual' 
                ? "border-blue-600 bg-blue-600/5 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            onClick={() => setSelectedPlan('annual')}
          >
            {/* Badge */}
            <div className="absolute -top-3 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
              MELHOR VALOR
            </div>

            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Anual</h3>
                <p className="text-[10px] text-zinc-400">Compromisso total</p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-xl">R$ 499,90</span>
                <span className="text-[10px] text-blue-400 font-bold">ECONOMIZE 50%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="space-y-4 mb-6">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            INCLUÍDO EM TODOS OS PLANOS
          </p>
          
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">Relatório Biométrico Completo</p>
                <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                  Análise profunda de 42 pontos faciais & índices de simetria.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">Guia de Estratégia IA</p>
                <p className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                  Rotinas personalizadas para otimização estética.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">Rastreamento Progressivo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
            onClick={handleSubscribe}
          >
            Ir para Pagamento <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
            <ShieldCheck className="h-3 w-3" />
            <span>Transação segura criptografada de 256-bit.</span>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full h-auto py-1 text-[10px] text-zinc-600 hover:text-zinc-400 hover:bg-transparent"
            onClick={() => setShowPaywall(false)}
          >
            Continuar com limitações
          </Button>
        </div>

      </DialogContent>
    </Dialog>
    </>
  );
}
