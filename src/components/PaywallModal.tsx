import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { PaywallContext } from "@/lib/paywall";
import PremiumContent from "@/components/PremiumContent";
import { usePaywallStore } from "@/lib/paywallStore";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logPaywallEvent } from "@/lib/paywall";
import { useNavigate } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  context?: PaywallContext;
}

const DEFAULT_BENEFITS = [
  "Recomendações detalhadas e personalizadas",
  "Análises ilimitadas",
  "Acompanhamento de progresso",
  "Suporte prioritário",
  "Desbloqueio de todas as features"
];

const CONTEXT_CONFIG: Record<string, { title: string; description: string; benefits?: string[] }> = {
  analysis_completed: {
    title: "Análise Concluída!",
    description: "Quer seu relatório completo + plano detalhado com passo a passo?",
    benefits: [
        "Relatório completo da sua análise",
        "Plano de ação personalizado",
        "Acesso vitalício ao histórico"
    ]
  },
  feature_locked: {
    title: "Recurso Premium",
    description: "Esse recurso é exclusivo para assinantes Premium. Ative para desbloquear agora.",
    benefits: [
        "Desbloqueie todas as ferramentas",
        "Análises ilimitadas",
        "Sem anúncios"
    ]
  },
  app_open: {
    title: "Progrida mais rápido",
    description: "Acelere seus resultados com o plano personalizado e acompanhamento.",
    benefits: [
        "Acompanhamento de evolução",
        "Dicas diárias exclusivas",
        "Prioridade no suporte"
    ]
  },
  report_view: {
    title: "Relatório Completo",
    description: "Tenha acesso a todos os detalhes da sua análise facial.",
    benefits: [
        "Análise detalhada de cada traço",
        "Comparação com celebridades",
        "Recomendações de harmonização"
    ]
  },
  periodic_force: {
      title: "Desbloqueie seu Potencial",
      description: "Aproveite todo o poder do Maximare IA agora.",
      benefits: DEFAULT_BENEFITS
  }
};

export const PaywallModal = ({ open, onClose, onUpgrade, context }: Props) => {
  const { profile } = useAuth();

  // Hooks sempre no topo (evita violação das Rules of Hooks)
  const { isPopupOpen, closePopup, popupContext } = usePaywallStore();
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  
  useEffect(() => {
    if (open && isPremium) {
      onClose();
    }
  }, [open, isPremium, onClose]);

  // Verificação definitiva de premium - não renderiza NADA se for premium
  // (usa o mesmo critério "strict" do app em vez de checar campos soltos do profile)
  if (isPremium) {
    return null;
  }

  // If Main modal is open, Popup modal should be closed by store logic
  // Here we just render Popup if state says so

  const handlePopupUpgrade = async () => {
     const { data: { session } } = await supabase.auth.getSession();
     if (session?.user) {
        await logPaywallEvent(session.user.id, 'paywall_cta_clicked', popupContext);
     }
     closePopup();
     navigate('/premium');
  };

  return (
    <>
      {/* MODAL 1: Main (High Priority) - Controlled by props (usePaywallGate) */}
      <Dialog open={open && !isPremium} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-none w-full h-full p-0 border-0 bg-black overflow-y-auto [&>button]:hidden z-[100]">
           <PremiumContent onClose={onClose} context={context} isModal />
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Popup (Low Priority) - Controlled by Global Store */}
      <Dialog open={isPopupOpen} onOpenChange={(v) => !v && closePopup()}>
        <DialogContent className="rounded-2xl border-border/50 bg-card max-w-sm z-[50]">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="font-heading text-xl">
               {CONTEXT_CONFIG[popupContext?.trigger || 'app_open']?.title || "Progrida mais rápido"}
            </DialogTitle>
            <DialogDescription>
               {CONTEXT_CONFIG[popupContext?.trigger || 'app_open']?.description || "Acelere seus resultados com o plano personalizado."}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 my-4">
            {DEFAULT_BENEFITS.slice(0, 3).map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-foreground">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <Button className="rounded-xl w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePopupUpgrade}>
              Ver planos
            </Button>
            <Button variant="ghost" className="rounded-xl text-muted-foreground w-full" onClick={closePopup}>
              Agora não
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PaywallModal;
