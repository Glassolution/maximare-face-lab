
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function PaymentPendingScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<"pending" | "success">("pending");
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes countdown

  // 1. Realtime Subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`payment-pending-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('[PaymentPending] Realtime update:', payload);
          const newStatus = payload.new.subscription_status;
          const expiresAt = payload.new.subscription_expires_at;
          
          if ((newStatus === 'active' || newStatus === 'trialing') && new Date(expiresAt) > new Date()) {
            handleSuccess();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 2. Polling every 2 seconds
  useEffect(() => {
    if (status === "success") return;

    const interval = setInterval(async () => {
      await checkStatus(false); // silent check
      
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [user, status]);

  // 3. Initial check on mount
  useEffect(() => {
    checkStatus(false);
  }, [user]);

  const checkStatus = async (manual: boolean) => {
    if (!user) return;
    if (manual) setIsChecking(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (data) {
        const { subscription_status, subscription_expires_at } = data;
        const isActive = (subscription_status === 'active' || subscription_status === 'trialing');
        const isValidDate = subscription_expires_at && new Date(subscription_expires_at) > new Date();

        if (isActive && isValidDate) {
          handleSuccess();
        } else if (manual) {
          toast.info("Pagamento ainda não confirmado. Aguarde mais um pouco.");
        }
      }
    } catch (err) {
      console.error("Error checking status:", err);
    } finally {
      if (manual) setIsChecking(false);
    }
  };

  const handleSuccess = () => {
    setStatus("success");
    toast.success("Pagamento confirmado! Bem-vindo ao Premium.");
    // Wait a bit before redirecting so user sees the success state
    setTimeout(() => {
      navigate("/profile", { replace: true });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20 z-0 pointer-events-none" />

      <div className="z-10 w-full max-w-md space-y-8 text-center">
        
        {status === "pending" ? (
          <>
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-pulse" />
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Aguardando confirmação...
              </h1>
              <p className="text-zinc-400 text-sm">
                Finalize o pagamento no app do banco ou Mercado Pago.
                Assim que aprovado, esta tela atualizará automaticamente.
              </p>
            </div>

            <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Tempo restante da sessão</p>
              <p className="text-2xl font-mono font-bold text-white">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                onClick={() => checkStatus(true)} 
                disabled={isChecking}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-6 font-semibold shadow-lg shadow-blue-900/20 transition-all"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Já paguei, verificar agora
                  </>
                )}
              </Button>

              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="w-full text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </div>
          </>
        ) : (
          <>
             <div className="relative mx-auto w-24 h-24 flex items-center justify-center bg-green-500/20 rounded-full mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>

            <div className="space-y-2 animate-in fade-in zoom-in duration-500">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Pagamento Aprovado!
              </h1>
              <p className="text-zinc-400">
                Seu acesso Premium foi liberado com sucesso.
              </p>
            </div>

            <div className="pt-8">
              <Button 
                onClick={() => navigate("/profile", { replace: true })}
                className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl py-6 font-bold shadow-lg shadow-green-900/20"
              >
                Continuar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
