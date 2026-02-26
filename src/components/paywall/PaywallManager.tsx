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
      <DialogContent className="sm:max-w-md rounded-3xl border-2 border-amber-500/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 animate-pulse">
            <Crown className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent">
            Desbloqueie o Potencial Máximo
          </DialogTitle>
          <DialogDescription className="text-base">
            {paywallType === 'full' 
              ? "Você atingiu o limite gratuito de hoje. Assine Premium para análises ilimitadas e acesso total."
              : "Torne-se Premium para análises ilimitadas, relatórios detalhados e prioridade na fila."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
            <Zap className="h-5 w-5 text-blue-500" />
            <div className="text-sm">
              <p className="font-semibold">Análises Ilimitadas</p>
              <p className="text-muted-foreground text-xs">Sem esperar 24h entre fotos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
            <Lock className="h-5 w-5 text-purple-500" />
            <div className="text-sm">
              <p className="font-semibold">Acesso ao Método Mogging</p>
              <p className="text-muted-foreground text-xs">Guias exclusivos de evolução</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button 
            className="w-full rounded-xl py-6 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/20"
            onClick={() => {
                setShowPaywall(false);
                navigate('/profile'); // Redirect to subscription plan
                toast.success("Ótima escolha! Escolha seu plano.");
            }}
          >
            Ser Premium Agora
          </Button>
          <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setShowPaywall(false)}>
            Continuar com limitações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
