import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, ArrowLeft, Calendar, CreditCard } from "lucide-react";

export default function Subscription() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isPremium = profile?.is_premium || profile?.subscription_status === "active";

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Nenhuma assinatura ativa</h1>
          <p className="text-muted-foreground">Assine o Premium para desbloquear todas as funcionalidades.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/analysis")}>Voltar</Button>
            <Button onClick={() => navigate("/premium")}>Ver planos</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Minha Assinatura</h1>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Premium</h2>
              <p className="text-sm text-muted-foreground capitalize">{profile?.plan_type || "Mensal"}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            {profile?.subscription_expires_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Válido até:</span>
                <span className="text-foreground font-medium">
                  {new Date(profile.subscription_expires_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pagamento via:</span>
              <span className="text-foreground font-medium">Mercado Pago</span>
            </div>
          </div>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Para cancelar sua assinatura, acesse sua conta no Mercado Pago.
        </p>
      </div>
    </div>
  );
}
