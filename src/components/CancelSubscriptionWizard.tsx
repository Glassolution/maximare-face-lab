import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getValidAccessToken } from "@/lib/session";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CancelSubscriptionWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [nps, setNps] = useState<number | "">("");
  const [hadIssues, setHadIssues] = useState<"yes" | "no" | "">("");
  const [issueDetails, setIssueDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const canNext = useMemo(() => {
    if (step === 1) return reason.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return true;
    return false;
  }, [step, reason]);

  const reset = () => {
    setStep(1);
    setReason("");
    setDetails("");
    setNps("");
    setHadIssues("");
    setIssueDetails("");
    setLoading(false);
  };

  const onClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submit = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Faça login novamente");
        setLoading(false);
        return;
      }
      const token = session.access_token;
      const payload: any = {
        reason_primary: reason,
        reason_details: details || null,
        nps: nps === "" ? null : Number(nps),
        had_issues: hadIssues === "" ? null : hadIssues === "yes",
        issue_details: issueDetails || null
      };
      const { data, error } = await supabase.functions.invoke("subscription-cancel", {
        headers: {
          "sb-access-token": token,
          "x-supabase-auth": token
        },
        body: payload
      });
      if (error) {
        const errMsg = (typeof error === "object" && error !== null && "message" in error) ? (error as any).message : String(error);
        const msg = errMsg?.toLowerCase()?.includes("unauthorized") ? "Sessão expirada. Faça login novamente." : (errMsg || "Erro ao cancelar assinatura");
        toast.error(String(msg));
        return;
      }
      if (data?.is_within_7_days) {
        if (data?.refund_status === "approved") {
          toast.success("Assinatura cancelada e estorno aprovado.");
          onClose(false);
        } else {
          toast.error("Estorno obrigatório falhou. Tente novamente em instantes.");
          return;
        }
      } else {
        toast.success("Assinatura cancelada. Sem estorno.");
        onClose(false);
      }
    } catch {
      toast.error("Erro ao cancelar assinatura");
    } finally {
      setLoading(false);
    }
  };

  const reasons = [
    "Preço",
    "Não vi valor",
    "Bugs ou problemas",
    "Uso pouco",
    "Outros"
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Cancelar assinatura</DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Motivo principal</p>
              <div className="grid grid-cols-2 gap-2">
                {reasons.map((r) => (
                  <Button
                    key={r}
                    variant={reason === r ? "default" : "outline"}
                    onClick={() => setReason(r)}
                    className="justify-start"
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <div />
              <Button disabled={!canNext} onClick={() => setStep(2)}>Continuar</Button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Detalhes (opcional)</p>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Conte mais" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Teve problemas técnicos?</p>
              <div className="flex gap-2">
                <Button variant={hadIssues === "yes" ? "default" : "outline"} onClick={() => setHadIssues("yes")}>Sim</Button>
                <Button variant={hadIssues === "no" ? "default" : "outline"} onClick={() => setHadIssues("no")}>Não</Button>
              </div>
            </div>
            {hadIssues === "yes" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Quais?</p>
                <Textarea value={issueDetails} onChange={(e) => setIssueDetails(e.target.value)} placeholder="Descreva o problema" />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">NPS (0–10) opcional</p>
              <Input
                type="number"
                min={0}
                max={10}
                value={nps}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setNps("");
                  else setNps(Math.max(0, Math.min(10, Number(v))));
                }}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
              <Button disabled={!canNext} onClick={() => setStep(3)}>Continuar</Button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted p-3 text-sm">
              <p>Você está prestes a cancelar sua assinatura.</p>
              <p>Se sua compra foi há menos de 7 dias, o estorno será solicitado automaticamente.</p>
              <p>Se foi há mais tempo, o cancelamento impede a renovação e o acesso segue até o fim do ciclo.</p>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={submit} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {loading ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

