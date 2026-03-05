import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getValidAccessToken } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Check,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CancelStep = "reason" | "confirm" | "result";

const CANCEL_REASONS = [
  { id: "too_expensive", label: "Muito caro" },
  { id: "not_using", label: "Não estou usando" },
  { id: "missing_features", label: "Falta funcionalidades" },
  { id: "found_alternative", label: "Encontrei alternativa" },
  { id: "temporary", label: "Pausa temporária" },
  { id: "other", label: "Outro motivo" },
];

export default function CancelSubscription() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<CancelStep>("reason");
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    refunded: boolean;
    is_within_7_days: boolean;
    message: string;
  } | null>(null);

  const lastPaymentAt = profile?.last_payment_at
    ? new Date(profile.last_payment_at as string)
    : null;
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const isWithin7Days = lastPaymentAt
    ? now.getTime() - lastPaymentAt.getTime() <= sevenDaysMs
    : false;

  const daysRemaining = lastPaymentAt
    ? Math.max(0, Math.ceil((sevenDaysMs - (now.getTime() - lastPaymentAt.getTime())) / (24 * 60 * 60 * 1000)))
    : 0;

  const handleCancel = async () => {
    setLoading(true);
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error("Sessão expirada");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            reason_primary: selectedReason,
            reason_details: details || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao cancelar");

      setResult({
        refunded: data.refunded,
        is_within_7_days: data.is_within_7_days,
        message: data.message,
      });
      setStep("result");
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar assinatura");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step === "reason" ? navigate(-1) : setStep("reason")}
            disabled={step === "result"}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            Cancelar Assinatura
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select reason */}
          {step === "reason" && (
            <motion.div
              key="reason"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {isWithin7Days && (
                <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Reembolso disponível
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Você ainda está dentro do período de 7 dias.
                        Ao cancelar, você receberá o reembolso integral.
                        {daysRemaining > 0 && (
                          <> Restam <strong>{daysRemaining} dia{daysRemaining > 1 ? "s" : ""}</strong>.</>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {!isWithin7Days && (
                <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Período de reembolso expirado
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        O período de 7 dias para reembolso já passou.
                        Ao cancelar, sua assinatura será encerrada sem reembolso.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <p className="text-sm text-muted-foreground font-medium">
                Por que deseja cancelar?
              </p>

              <div className="space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <Card
                    key={reason.id}
                    className={`p-3 cursor-pointer transition-all border-2 ${
                      selectedReason === reason.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                    onClick={() => setSelectedReason(reason.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedReason === reason.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {selectedReason === reason.id && (
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm text-foreground">{reason.label}</span>
                    </div>
                  </Card>
                ))}
              </div>

              {selectedReason && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <p className="text-sm text-muted-foreground">
                    Quer nos contar mais? (opcional)
                  </p>
                  <Textarea
                    placeholder="Sua opinião nos ajuda a melhorar..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                  />
                </motion.div>
              )}

              <Button
                className="w-full"
                variant="destructive"
                disabled={!selectedReason}
                onClick={() => setStep("confirm")}
              >
                Continuar
              </Button>
            </motion.div>
          )}

          {/* Step 2: Confirm */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <Card className="p-5 border-destructive/30 bg-destructive/5 text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                <h2 className="text-lg font-bold text-foreground">
                  Tem certeza?
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isWithin7Days
                    ? "Ao confirmar, sua assinatura será cancelada e o valor pago será reembolsado."
                    : "Ao confirmar, sua assinatura será cancelada imediatamente. Não haverá reembolso."}
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 text-left">
                  <li>• Você perderá acesso às análises ilimitadas</li>
                  <li>• Resultados detalhados serão bloqueados</li>
                  <li>• Suporte prioritário será removido</li>
                </ul>
              </Card>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={loading}
                  onClick={handleCancel}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : isWithin7Days ? (
                    "Cancelar e receber reembolso"
                  ) : (
                    "Confirmar cancelamento"
                  )}
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={loading}
                  onClick={() => navigate("/analysis")}
                >
                  Manter minha assinatura
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Result */}
          {step === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-5 py-8"
            >
              {result.refunded ? (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    Reembolso processado!
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Sua assinatura foi cancelada e o reembolso será creditado
                    em sua conta em até 5 dias úteis.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    Assinatura cancelada
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {result.message}
                  </p>
                </>
              )}

              <Button className="w-full" onClick={() => navigate("/analysis")}>
                Voltar ao app
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
