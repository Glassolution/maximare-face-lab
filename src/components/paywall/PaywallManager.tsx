import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisLimit } from "@/hooks/useAnalysisLimit";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PaywallManagerProps {
  children: React.ReactNode;
  trigger: string;
}

export function PaywallManager() {
  const { user } = useAuth();
  const { isPremium } = useAnalysisLimit();
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'quarterly' | 'lifetime'>('lifetime');
  const navigate = useNavigate();

  // Session State (Memory only)
  const [sessionCount, setSessionCount] = useState(0);
  const [lastShownAt, setLastShownAt] = useState<number>(0);

  // Constants
  const COOLDOWN_MS = 120000; // 2 minutes
  const MAX_PER_SESSION = 3;

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
      navigate('/profile'); 
      toast.success(`Plano ${selectedPlan === 'lifetime' ? 'Vitalício' : 'Trimestral'} selecionado!`);
  };
  
  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="w-[90%] max-w-[380px] p-6 rounded-[2rem] border border-white/10 bg-[#0a0a0a] text-white backdrop-blur-xl shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Desbloqueie seu Potencial</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Selecione um protocolo científico para liberar sua análise biométrica completa.
          </p>
        </div>

        {/* Plan Selection */}
        <div className="space-y-3 mb-6">
          {/* Quarterly Plan */}
          <div 
            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              selectedPlan === 'quarterly' 
                ? "border-blue-600 bg-blue-600/5 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            onClick={() => setSelectedPlan('quarterly')}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Acesso Trimestral</h3>
                <p className="text-xs text-zinc-400 mt-1">Ciclo biológico de 90 dias</p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-xl">R$ 49</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Por Trimestre</span>
              </div>
            </div>
          </div>

          {/* Lifetime Plan */}
          <div 
            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
              selectedPlan === 'lifetime' 
                ? "border-blue-600 bg-blue-600/5 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
            onClick={() => setSelectedPlan('lifetime')}
          >
            {/* Badge */}
            <div className="absolute -top-3 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
              MELHOR VALOR
            </div>

            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Protocolo Vitalício</h3>
                <p className="text-xs text-zinc-400 mt-1">Baseline genético único</p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-xl">R$ 129</span>
                <span className="text-[10px] text-blue-400 font-bold">ECONOMIZE 60%</span>
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
  );
}
