import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check } from "lucide-react";

const benefits = [
  "Recomendações detalhadas e personalizadas",
  "Análises ilimitadas",
  "Acompanhamento de progresso",
  "Suporte prioritário",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export default function PaywallModal({ open, onClose, onUpgrade }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl border-border/50 bg-card max-w-sm">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="font-heading text-xl">Upgrade para Premium</DialogTitle>
          <DialogDescription>Desbloqueie todo o potencial do Maximare</DialogDescription>
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
          <Button className="rounded-xl" onClick={onUpgrade}>Ver planos</Button>
          <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={onClose}>
            Continuar com versão gratuita
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
