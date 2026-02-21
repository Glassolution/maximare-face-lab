
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";
import { PaywallContext } from "@/lib/paywall";
import PremiumContent from "@/components/PremiumContent";

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

export default function PaywallModal({ open, onClose, onUpgrade, context }: Props) {
  const isScreenVariant = context?.variant === 'screen' || context?.trigger === 'periodic_force';

  if (isScreenVariant && open) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-none w-full h-full p-0 border-0 bg-black overflow-y-auto [&>button]:hidden">
           <PremiumContent onClose={onClose} context={context} isModal />
        </DialogContent>
      </Dialog>
    );
  }

  const trigger = context?.trigger || 'manual';
  const config = CONTEXT_CONFIG[trigger] || {
      title: "Desbloqueie o Premium",
      description: "Desbloqueie todo o potencial do Maximare",
      benefits: DEFAULT_BENEFITS
  };

  const benefits = config.benefits || DEFAULT_BENEFITS;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl border-border/50 bg-card max-w-sm">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="font-heading text-xl">{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 my-4">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm text-foreground">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {b}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <Button className="rounded-xl w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={onUpgrade}>Ver planos</Button>
          <Button variant="ghost" className="rounded-xl text-muted-foreground w-full" onClick={onClose}>
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
