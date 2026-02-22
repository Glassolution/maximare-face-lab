import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const status = searchParams.get("status"); // success, failure, pending
  const purchaseId = searchParams.get("purchase_id");
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // If we have a success status, let's wait a moment for the webhook to process
    // and then verify if the user is premium.
    
    if (!user) return;

    if (status === 'success') {
      const verifyPremium = async () => {
        setVerifying(true);
        // Wait 3 seconds for webhook
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .single();
        
        if (profile?.subscription_status === 'active') {
            setVerifying(false);
            // Redirect to profile after short delay
            setTimeout(() => navigate("/profile"), 2000);
        } else {
            // Retry once more after 3s
             await new Promise(resolve => setTimeout(resolve, 3000));
             const { data: profileRetry } = await supabase
                .from('profiles')
                .select('subscription_status')
                .eq('id', user.id)
                .single();
             
             if (profileRetry?.subscription_status === 'active') {
                 setTimeout(() => navigate("/profile"), 2000);
             }
             setVerifying(false);
        }
      };
      
      verifyPremium();
    } else {
        setVerifying(false);
    }
  }, [status, user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {status === "success" ? (
        <div className="space-y-6 max-w-sm">
          {verifying ? (
             <div className="flex flex-col items-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h1 className="text-2xl font-bold">Verificando pagamento...</h1>
                <p className="text-muted-foreground">Aguarde enquanto confirmamos sua assinatura.</p>
             </div>
          ) : (
             <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <CheckCircle2 className="h-20 w-20 text-green-500 mb-4" />
                <h1 className="text-2xl font-bold text-green-500">Pagamento Aprovado!</h1>
                <p className="text-muted-foreground">Você agora é Premium. Aproveite todos os recursos ilimitados.</p>
                <Button 
                    className="w-full mt-6 bg-green-600 hover:bg-green-700" 
                    onClick={() => navigate("/profile")}
                >
                    Ir para meu Perfil
                </Button>
             </div>
          )}
        </div>
      ) : status === "pending" ? (
        <div className="space-y-6 max-w-sm">
          <Loader2 className="h-20 w-20 text-yellow-500 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-yellow-500">Pagamento Pendente</h1>
          <p className="text-muted-foreground">Estamos aguardando a confirmação do seu pagamento. Isso pode levar alguns minutos.</p>
          <Button variant="outline" onClick={() => navigate("/profile")}>
            Voltar ao App
          </Button>
        </div>
      ) : (
        <div className="space-y-6 max-w-sm">
          <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-500">Pagamento Falhou</h1>
          <p className="text-muted-foreground">Não foi possível processar seu pagamento. Tente novamente.</p>
          <Button variant="default" onClick={() => navigate("/premium")}>
            Tentar Novamente
          </Button>
          <Button variant="ghost" onClick={() => navigate("/profile")}>
            Voltar
          </Button>
        </div>
      )}
    </div>
  );
}
