import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysisLimit } from "@/hooks/useAnalysisLimit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Clock, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PaywallManagerProps {
  children: React.ReactNode;
  trigger: string; // 'app_open', 'analysis_click', 'feature_access'
}

export function PaywallManager() {
  const { user } = useAuth();
  const { isPremium, canAnalyze, remainingToday } = useAnalysisLimit();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallType, setPaywallType] = useState<'light' | 'full'>('light');
  const navigate = useNavigate();

  // Session State (Memory only)
  const [sessionCount, setSessionCount] = useState(0);
  const [lastShownAt, setLastShownAt] = useState<number>(0);

  // Constants
  const COOLDOWN_MS = 120000; // 2 minutes
  const MAX_PER_SESSION = 3;

  const triggerPaywall = (type: 'light' | 'full' = 'light') => {
    if (isPremium) return; // Never show for premium
    if (sessionCount >= MAX_PER_SESSION) return; // Don't spam
    
    const now = Date.now();
    if (now - lastShownAt < COOLDOWN_MS) return; // Cooldown

    setPaywallType(type);
    setShowPaywall(true);
    setLastShownAt(now);
    setSessionCount(prev => prev + 1);
    
    // Log event (analytics)
    console.log(`Paywall shown: ${type}`);
  };

  // Initial App Open Trigger
  useEffect(() => {
    if (!user || isPremium) return;
    
    // Small delay to not be annoying immediately on mount
    const timer = setTimeout(() => {
        triggerPaywall('light');
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, isPremium]);

  // Expose trigger method globally if needed via Context, but for now just auto-trigger logic
  // Or export hook.
  
  return (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="w-[90%] max-w-[340px] rounded-3xl border-2 border-blue-500/20 bg-background/95 backdrop-blur-xl p-5">
        <DialogHeader className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-1 animate-pulse">
            <Crown className="h-6 w-6 text-blue-500" />
          </div>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent leading-tight">
            Desbloqueie o Potencial Máximo
          </DialogTitle>
          <DialogDescription className="text-sm">
            {paywallType === 'full' 
              ? "Limite gratuito atingido. Assine Premium para acesso total."
              : "Torne-se Premium para análises ilimitadas e prioridade."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-3">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/50 border border-border/50">
            <Zap className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold">Análises Ilimitadas</p>
              <p className="text-muted-foreground text-[10px]">Sem esperar 24h entre fotos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/50 border border-border/50">
            <Lock className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold">Método Mogging</p>
              <p className="text-muted-foreground text-[10px]">Guias exclusivos de evolução</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <Button 
            className="w-full rounded-2xl py-5 text-sm font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20"
            onClick={() => {
                setShowPaywall(false);
                navigate('/profile'); // Redirect to subscription plan
                toast.success("Ótima escolha! Escolha seu plano.");
            }}
          >
            Ser Premium Agora
          </Button>
          <Button variant="ghost" className="text-[10px] text-muted-foreground rounded-xl h-auto py-2" onClick={() => setShowPaywall(false)}>
            Continuar com limitações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
