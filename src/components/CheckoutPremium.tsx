import { useEffect, useState, useMemo, useRef } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Copy, Check, CreditCard, QrCode, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CheckoutPremiumProps {
  plan: 'weekly' | 'monthly' | 'yearly';
  price: number;
  onSuccess: (email: string) => void;
  onCancel: () => void;
}

import { useAuth } from "@/hooks/useAuth";

import { AlertTriangle, LifeBuoy, RefreshCw } from 'lucide-react';

export const CheckoutPremium = ({ plan, price, onSuccess, onCancel }: CheckoutPremiumProps) => {
  const { refreshSession } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const cardPaymentBrickController = useRef<any>(null);
  
  // User data
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');

  const [remountKey, setRemountKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  const [showTimeoutFallback, setShowTimeoutFallback] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);

  // PIX State
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string; ticket_url: string; user_id: string; payment_id: string } | null>(null);
  const [copied, setCopied] = useState(false);


  const [initialEmail, setInitialEmail] = useState('');

  const initialization = useMemo(() => ({ amount: price }), [price]);
  const customization = useMemo(() => ({
    paymentMethods: {
      maxInstallments: 12,
    },
    visual: {
      style: {
        theme: 'default',
      } as const,
      hidePaymentButton: false, 
    },
  }), []);

  useEffect(() => {
    const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
    if (publicKey) {
      initMercadoPago(publicKey, { locale: 'pt-BR' });
      setReady(true);
    } else {
      toast.error("Erro de configuração: Chave pública do Mercado Pago não encontrada.");
    }

    const loadUser = async () => {
      try {
        // Timeout promise
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
        const userPromise = supabase.auth.getUser();
        
        const { data: { user }, error } = await Promise.race([userPromise, timeout]) as any;

        // If error is related to refresh token (AuthSessionMissingError or similar), we should ignore and treat as guest
        if (error) {
            console.warn("User load warning:", error.message);
            // Proceed as guest, do not throw
        }
        
        if (user?.email) {
          setEmail(user.email);
          setInitialEmail(user.email); 
          const meta = user.user_metadata;
          if (meta?.full_name) {
            const parts = meta.full_name.split(' ');
            setFirstName(parts[0]);
            setLastName(parts.slice(1).join(' '));
          }
        }
      } catch (e) {
        console.error("Error loading user:", e);
        // Even on error, we should let the user try to checkout manually
      } finally {
        setLoadingUser(false);
        setReady(true);
      }
    };
    loadUser();
  }, []);

  // Poll for payment approval (Realtime or Polling)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let subscription: any;

    const targetUserId = pixData?.user_id || (verifying && email ? (async () => {
        // We need user ID to subscribe. If verifying card payment, we might need to fetch it or rely on polling by query?
        // Actually, we can just poll 'profiles' if we have the ID.
        // But we might not have the ID if we are guest?
        // Wait, handleCardSubmit uses 'email' to identify user.
        // If we are verifying, we should try to find the user.
        return null; 
    })() : null);

    // If we have a user ID (from PIX or logged in), we can listen
    // If not logged in, we rely on email... but we can't poll by email easily (RLS).
    // But if the user is making a payment, they are likely logged in OR we have their session.
    
    // Let's simplify: Only poll if we have a way to identify the user.
    // If the user is logged in, supabase.auth.getUser() gave us the user.
    // We can use that ID.
    
    // Intelligent Polling with Backoff
    const checkStatus = async () => {
        // 1. Check RPC (if payment ID exists)
        if (currentPaymentId || pixData?.payment_id) {
             const payId = currentPaymentId || pixData?.payment_id;
             console.log("Checking payment status via RPC:", payId);
             
             try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('check_payment_status', { 
                    payment_id_input: payId 
                });

                if (rpcData && rpcData.success) {
                    console.log("[Checkout] RPC Approved. Forcing session refresh...", rpcData);
                    toast.success("Pagamento confirmado! Acesso liberado.");
                    setVerifying(false);
                    
                    // 1. Force Refresh Session & Profile
                    await refreshSession();
                    
                    // 2. Double check profile state after refresh (Optional, for logging)
                    const { data: { user: updatedUser } } = await supabase.auth.getUser();
                    if (updatedUser) {
                        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', updatedUser.id).single();
                        console.log("[Checkout] Final Profile State:", {
                            is_premium: updatedProfile?.is_premium,
                            status: updatedProfile?.subscription_status,
                            plan: updatedProfile?.plan_type,
                            expires: updatedProfile?.subscription_expires_at
                        });
                    }

                    onSuccess(email);
                    return true; // Stop polling
                } else if (rpcData?.error && rpcData?.error.includes("Rate limit")) {
                    console.log("Rate limit hit, skipping cycle");
                }
             } catch (err) {
                 console.error("Polling Error:", err);
             }
        }

        // 2. Profile Polling (Backup)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data } = await supabase
            .from('profiles')
            .select('subscription_status, is_premium, payment_status')
            .eq('id', user.id)
            .maybeSingle();
        
        if (data?.subscription_status === 'active' || data?.is_premium) {
            toast.success("Pagamento confirmado! Acesso liberado.");
            setVerifying(false);
            onSuccess(email);
            return true;
        }
        return false;
    };

    if (pixData?.user_id || verifying) {
        console.log("Starting intelligent polling...");
        if (!pollingStartTime) setPollingStartTime(Date.now());

        let attempts = 0;
        
        const runPoll = async () => {
            attempts++;
            const done = await checkStatus();
            if (done) return;

            // Timeout Logic (60s)
            const elapsed = Date.now() - (pollingStartTime || Date.now());
            if (elapsed > 60000) {
                setShowTimeoutFallback(true);
                // Don't stop polling completely, just slow down significantly to 10s
                // But UI changes to show fallback
            }

            // Backoff Strategy
            let nextDelay = 3000; // Default 3s
            if (attempts > 20) nextDelay = 5000; // After 1 min (20 * 3s), slow to 5s
            
            // Hard stop after 5 minutes of total failure
            if (attempts > 100) { 
                setVerifying(false);
                toast.error("O tempo limite excedeu. Verifique se o pagamento foi debitado.");
                return;
            }

            if (verifying || pixData?.user_id) {
                interval = setTimeout(runPoll, nextDelay);
            }
        };

        runPoll();
    }

    return () => {
        if (interval) clearTimeout(interval);
        if (subscription) supabase.removeChannel(subscription);
    };
  }, [pixData, verifying, onSuccess, email, currentPaymentId]);

  const manualCheck = async () => {
      setShowTimeoutFallback(false); // Reset fallback UI if user retries manually
      setPollingStartTime(Date.now()); // Reset timeout counter
      
      toast.info("Verificando status...");
      const payId = currentPaymentId || pixData?.payment_id;
      
      if (payId) {
          try {
            // Use RPC because Edge Function deploy failed
            const { data: rpcData } = await supabase.rpc('check_payment_status', { payment_id_input: payId });
            
            if (rpcData && rpcData.success) {
                console.log("[Checkout] Manual Check Approved.");
                toast.success("Confirmado!");
                setVerifying(false);
                await refreshSession();
                onSuccess(email);
                return;
            } else {
                 if (rpcData?.status === 'pending') {
                     toast.warning("O pagamento ainda está pendente no banco.");
                 } else {
                     toast.warning("Pagamento não confirmado ainda. Tente novamente.");
                 }
                 return;
            }
          } catch (err) {
              console.error("Manual Check Error:", err);
          }
      }
      
      // Fallback Profile Check
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data } = await supabase.from('profiles').select('subscription_status, is_premium').eq('id', user.id).maybeSingle();
          if (data?.subscription_status === 'active' || data?.is_premium) {
              console.log("[Checkout] Manual Profile Check Approved.");
              toast.success("Confirmado!");
              setVerifying(false);
              await refreshSession();
              onSuccess(email);
          } else {
              toast.warning("Pagamento ainda não confirmado pelo banco. Tente novamente em instantes.");
          }
      }
  };

  const handleCardSubmit = async (formData: any) => {
    setLoading(true);
    setVerifying(false);
    try {
      const { token, issuer_id, payment_method_id, installments, payer } = formData;

      // Timeout for Edge Function (15s)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );

      const functionPromise = supabase.functions.invoke('create-payment', {
        body: {
          token,
          issuer_id,
          payment_method_id,
          installments,
          payer: {
            email: payer.email || email,
            identification: payer.identification || { type: 'CPF', number: cpf },
            first_name: firstName,
            last_name: lastName
          },
          plan_id: plan
        }
      });

      const result: any = await Promise.race([functionPromise, timeoutPromise]);
      const { data, error } = result;

      if (error) throw new Error(error.message || 'Erro ao processar pagamento.');
      if (data?.error) throw new Error(data.error);

      // Track Payment ID for polling
      if (data?.payment_id) {
          setCurrentPaymentId(data.payment_id.toString());
          setPollingStartTime(Date.now());
      }

      if (data?.status === 'approved') {
        toast.success("Pagamento aprovado!");
        onSuccess(email);
      } else if (data?.status === 'in_process' || data?.status === 'pending') {
        toast.info("Pagamento em processamento. Aguarde a confirmação.");
        setVerifying(true); // Start polling
        setPollingStartTime(Date.now());
      } else {
        toast.error(`Pagamento não aprovado. Status: ${data?.status}`);
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      // If timeout or 500, we switch to verification mode because payment might have been sent
      if (err.message === 'Timeout' || err.message?.includes('500') || err.message?.includes('network')) {
          toast.warning("A resposta do servidor demorou, mas seu pagamento pode ter sido processado. Verificando...");
          setVerifying(true);
      } else {
          toast.error(err.message || "Ocorreu um erro ao processar o pagamento.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePixSubmit = async () => {
    if (!email || !firstName || !lastName || !cpf) {
        toast.error("Por favor, preencha todos os campos.");
        return;
    }

    setLoading(true);
    try {
        const { data, error } = await supabase.functions.invoke('create-payment', {
            body: {
                payment_method_id: 'pix',
                payer: {
                    email,
                    identification: { type: 'CPF', number: cpf.replace(/\D/g, '') },
                    first_name: firstName,
                    last_name: lastName
                },
                plan_id: plan
            }
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        if (data.qr_code && data.qr_code_base64) {
            setPixData({
                qr_code: data.qr_code,
                qr_code_base64: data.qr_code_base64,
                ticket_url: data.ticket_url,
                user_id: data.user_id,
                payment_id: data.payment_id // Ensure backend returns this
            });
            toast.success("QR Code gerado! Realize o pagamento.");
        } else {
            throw new Error("Erro ao gerar QR Code PIX.");
        }

    } catch (err: any) {
        console.error('PIX Error:', err);
        toast.error(err.message || "Erro ao gerar PIX.");
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (pixData?.qr_code) {
        navigator.clipboard.writeText(pixData.qr_code);
        setCopied(true);
        toast.success("Código PIX copiado!");
        setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loadingUser || !ready) {
    return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  }

  if (verifying) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg border border-gray-100 text-center space-y-6">
        <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full animate-pulse">
                <ShieldCheck className="h-10 w-10 text-blue-600" />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Verificando pagamento...</h2>
        <p className="text-gray-500">Isso pode levar até 1 minuto. Por favor, não feche esta janela.</p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 p-4 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Consultando status no servidor...</span>
        </div>

        <Button onClick={manualCheck} variant="outline" className="w-full mt-4">
            Já realizei o pagamento (Recarregar)
        </Button>

        <p className="text-xs text-gray-400">Se você já recebeu a confirmação do banco, o acesso será liberado em instantes.</p>
      </div>
    );
  }

  // If PIX generated, show QR Code Screen
  if (pixData) {
      return (
          <div className="w-full max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 text-center space-y-6">
              <div className="flex justify-center mb-4">
                  <div className="bg-green-100 p-3 rounded-full">
                      <QrCode className="h-8 w-8 text-green-600" />
                  </div>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900">Pagamento via PIX</h2>
              <p className="text-sm text-gray-500">Escaneie o QR Code ou copie o código abaixo para pagar.</p>
              
              <div className="flex justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <img 
                    src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 object-contain"
                  />
              </div>

              <div className="space-y-2">
                  <Label className="text-xs uppercase text-gray-400 font-semibold tracking-wider">Código PIX Copia e Cola</Label>
                  <div className="flex gap-2">
                      <Input value={pixData.qr_code} readOnly className="text-xs bg-gray-50 font-mono" />
                      <Button size="icon" variant="outline" onClick={copyToClipboard}>
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                  </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Aguardando confirmação automática...</span>
              </div>

              <Button variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                  Cancelar
              </Button>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Checkout Seguro</h2>
        <div className="flex items-center justify-center gap-2 text-sm text-green-600 mt-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Ambiente Criptografado</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">Plano {plan === 'weekly' ? 'Semanal' : plan === 'monthly' ? 'Mensal' : 'Anual'} - R$ {price.toFixed(2)}</p>
      </div>

      <Tabs defaultValue="card" onValueChange={(v) => setPaymentMethod(v as 'card' | 'pix')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="card" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Cartão
          </TabsTrigger>
          <TabsTrigger value="pix" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" /> PIX
          </TabsTrigger>
        </TabsList>

        {/* Common Personal Info Fields (Needed for both, but Card Brick handles its own sometimes) */}
        {/* Actually, for Transparent Checkout, we usually need to send Payer info to MP for fraud prevention */}
        <div className="space-y-4 mb-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input 
                        id="firstName" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        placeholder="Seu nome"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input 
                        id="lastName" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        placeholder="Sobrenome"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="seu@email.com"
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="cpf">CPF (apenas números)</Label>
                <Input 
                    id="cpf" 
                    value={cpf} 
                    onChange={(e) => setCpf(e.target.value)} 
                    placeholder="000.000.000-00"
                    maxLength={14}
                />
            </div>
        </div>

        <TabsContent value="card" className="mt-0">
          <div className="payment-brick-container min-h-[300px]">
            {ready && (
            <CardPayment
              key={remountKey}
              initialization={initialization}
              customization={customization}
              onReady={(controller) => {
                cardPaymentBrickController.current = controller;
              }}
              onSubmit={async (formData) => {
                // Mercado Pago Brick returns formData directly with token, etc.
                await handleCardSubmit(formData);
              }}
              onError={(error) => {
                 console.error("MP Brick Error:", error);
                 // Only show toast for critical errors, ignore trivial ones during setup
                 if (error?.type === 'critical') {
                    // toast.error("Erro no formulário de pagamento. Tente recarregar.");
                    console.log("Ignored critical error during init (common with empty email)");
                    // Force remount to recover from critical error
                    setRemountKey(prev => prev + 1);
                 }
              }}
            />
            )}
          </div>
        </TabsContent>

        <TabsContent value="pix" className="mt-0 space-y-4">
            <Alert className="bg-green-50 border-green-200">
                <QrCode className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Pagamento Instantâneo</AlertTitle>
                <AlertDescription className="text-green-700 text-xs">
                    Liberação imediata após o pagamento.
                </AlertDescription>
            </Alert>
            
            <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6"
                onClick={handlePixSubmit}
                disabled={loading}
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <QrCode className="h-5 w-5 mr-2" />}
                {loading ? "Gerando PIX..." : "Gerar Código PIX"}
            </Button>
        </TabsContent>
      </Tabs>
      
      {!pixData && (
        <div className="mt-4 text-center">
            <Button variant="ghost" onClick={onCancel} disabled={loading} className="text-sm">
                Cancelar
            </Button>
        </div>
      )}
      
      {loading && !pixData && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 rounded-xl">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                <p className="text-sm font-medium">Processando...</p>
            </div>
        </div>
      )}
    </div>
  );
};
