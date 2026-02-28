
import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Payment, CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import { Loader2, QrCode, Check, Copy, AlertTriangle, LifeBuoy, RefreshCw, ChevronLeft, CreditCard, Lock, ShieldCheck, Info } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import { PLAN_CONFIG } from "@/config/plans";
import { trackEvent, captureException } from "@/lib/posthog";
import { motion } from "framer-motion";

initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || 'TEST-539d056c-2673-4566-a401-4475f82245c7', {
  locale: 'pt-BR'
});

interface CheckoutPremiumProps {
  plan: 'weekly' | 'monthly' | 'yearly';
  price: number;
  onSuccess: (email: string) => void;
  onCancel: () => void;
}

const ProgressBar = () => {
  return (
    <div className="px-8 mb-8">
      <div className="flex items-center justify-between relative">
        {/* Step 1: Análise */}
        <div className="flex flex-col items-center z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white mb-2 shadow-[0_0_15px_rgba(59,130,246,0.5)] border-2 border-blue-400"
          >
            <Check className="w-5 h-5" />
          </motion.div>
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Análise</span>
        </div>

        {/* Line 1 */}
        <div className="flex-grow h-[2px] bg-zinc-800 mx-2 relative overflow-hidden">
            <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full bg-blue-500"
            />
        </div>

        {/* Step 2: Plano */}
        <div className="flex flex-col items-center z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white mb-2 shadow-[0_0_15px_rgba(59,130,246,0.5)] border-2 border-blue-400"
          >
             <Check className="w-5 h-5" />
          </motion.div>
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Plano</span>
        </div>

        {/* Line 2 */}
        <div className="flex-grow h-[2px] bg-zinc-800 mx-2 relative overflow-hidden">
            <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full bg-blue-500"
            />
        </div>

        {/* Step 3: Pagamento */}
        <div className="flex flex-col items-center z-10">
           <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="relative"
           >
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 bg-background-light dark:bg-background-dark mb-2 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
                {/* Ping animation ring */}
                <div className="absolute inset-0 rounded-full border border-blue-500 animate-ping opacity-20"></div>
           </motion.div>
          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Pagamento</span>
        </div>
      </div>
    </div>
  );
};

export const CheckoutPremium = ({ plan, price, onSuccess, onCancel }: CheckoutPremiumProps) => {
  const { refreshSession } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sdkReady] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const cardPaymentBrickController = useRef<any>(null);
  const notifiedRef = useRef(false);
  
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

  // Use a stable reference for initialization to prevent re-renders
  // We ignore changes to email/price after mount to avoid resetting the form
  const initialization = useMemo(() => ({ 
    amount: price,
    payer: {
      email: 'customer@email.com', // Placeholder, real email is sent on submit
      entity_type: 'individual',
    }
  }), []); // Empty dependency array = STABLE

  const customization = useMemo(() => ({
    paymentMethods: {
      maxInstallments: 12,
      ticket: [],
      bankTransfer: [],
      atm: [],
      creditCard: "all",
      debitCard: "all",
    },
    visual: {
        style: {
            theme: 'dark',
            customVariables: {
                buttonBackgroundColor: '#3b82f6', // Azul padrão do site (blue-500)
                buttonTextColor: '#ffffff',
            }
        },
        hidePaymentButton: false,
    },
  }), []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || '');
          setInitialEmail(user.email || '');
          
          if (user.user_metadata?.full_name) {
            const parts = user.user_metadata.full_name.split(' ');
            setFirstName(parts[0]);
            setLastName(parts.slice(1).join(' '));
          }
        }
      } catch (e) {
        console.error("Error fetching user", e);
      } finally {
        setLoadingUser(false);
        setReady(true);
      }
    };
    fetchUser();
  }, []);

  // Intelligent Polling with Backoff
  const checkStatus = async () => {
      // 1. Check RPC (if payment ID exists)
      if (currentPaymentId || pixData?.payment_id) {
           const payId = currentPaymentId || pixData?.payment_id;
           logger.log("[Checkout]", "Checking payment status via RPC:", payId);
           
           try {
              const { data: rpcData, error: rpcError } = await supabase.rpc('check_payment_status', { 
                  payment_id_input: payId 
              });

              if (rpcData && rpcData.success) {
                  logger.log("[Checkout]", "RPC Approved. Forcing session refresh...", rpcData);
                  if (!notifiedRef.current) {
                    notifiedRef.current = true;
                    toast.success("Pagamento confirmado! Acesso liberado.");
                  }
                  setVerifying(false);
                  
                  // 1. Force Refresh Session & Profile
                  await refreshSession();
                  
                  // 2. Double check profile state after refresh (Optional, for logging)
                  const { data: { user: updatedUser } } = await supabase.auth.getUser();
                  if (updatedUser) {
                      const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', updatedUser.id).single();
                      logger.log("[Checkout]", "Final Profile State:", {
                          is_premium: updatedProfile?.is_premium,
                          status: updatedProfile?.subscription_status,
                          plan: updatedProfile?.plan_type,
                          expires: updatedProfile?.subscription_expires_at
                      });
                  }

                  onSuccess(email);
                  return true; // Stop polling
              } else if (rpcData?.error && rpcData?.error.includes("Rate limit")) {
                  logger.log("[Checkout]", "Rate limit hit, skipping cycle");
              }
           } catch (err) {
               logger.error("[Checkout]", "Polling Error:", err);
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
          logger.log("[Checkout]", "Profile Polling found active status!");
          if (!notifiedRef.current) {
            notifiedRef.current = true;
            toast.success("Pagamento confirmado! Acesso liberado.");
          }
          setVerifying(false);
          await refreshSession(); // Ensure global state is synced
          onSuccess(email);
          return true;
      }
      return false;
  };

  if (pixData?.user_id || verifying) {
      logger.log("[Checkout]", "Starting intelligent polling...");
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
              return;
          }

          if (verifying || pixData?.user_id) {
              setTimeout(runPoll, nextDelay);
          }
      };

      runPoll();
  }

  // Effect to handle cleanup
  useEffect(() => {
    return () => {
        // Cleanup if needed
    };
  }, [pixData, verifying, onSuccess, email, currentPaymentId]);

  const manualCheck = async () => {
      setShowTimeoutFallback(false); // Reset fallback UI if user retries manually
      setPollingStartTime(Date.now()); // Reset timeout counter
      
      const payId = currentPaymentId || pixData?.payment_id;
      
      if (payId) {
          try {
            // Use RPC because Edge Function deploy failed
            const { data: rpcData } = await supabase.rpc('check_payment_status', { payment_id_input: payId });
            
            if (rpcData && rpcData.success) {
                logger.log("[Checkout]", "Manual Check Approved.");
                if (!notifiedRef.current) {
                  notifiedRef.current = true;
                  toast.success("Pagamento confirmado! Acesso liberado.");
                }
                setVerifying(false);
                await refreshSession();
                onSuccess(email);
                return;
            } else {
                 return;
            }
          } catch (err) {
              logger.error("[Checkout]", "Manual Check Error:", err);
          }
      }
      
      // Fallback Profile Check
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          const { data } = await supabase.from('profiles').select('subscription_status, is_premium').eq('id', user.id).maybeSingle();
          if (data?.subscription_status === 'active' || data?.is_premium) {
              logger.log("[Checkout]", "Manual Profile Check Approved.");
              if (!notifiedRef.current) {
                notifiedRef.current = true;
                toast.success("Pagamento confirmado! Acesso liberado.");
              }
              setVerifying(false);
              await refreshSession();
              onSuccess(email);
          } else {
          }
      }
  };

  const handleCardSubmit = async (formData: any) => {
    // Mercado Pago Brick handles card tokenization internally
    // We just need to send the data to our backend
    setLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('create-payment', {
            body: {
                payment_method_id: formData.payment_method_id, // e.g. 'master'
                token: formData.token,
                issuer_id: formData.issuer_id,
                installments: formData.installments,
                payer: {
                    email: formData.payer.email,
                    identification: formData.payer.identification
                },
                plan_id: PLAN_CONFIG.PLANS[plan].id
            }
        });

        if (error) throw error;
        
        // Track Payment ID for polling
        if (data?.payment_id) {
            setCurrentPaymentId(data.payment_id.toString());
            setPollingStartTime(Date.now());
        }

        // PostHog: track payment outcome
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const distinctId = currentUser?.id || 'anonymous';

        if (data.status === 'approved') {
            toast.success("Pagamento aprovado!");
            trackEvent(distinctId, 'payment_completed', {
              plan,
              price,
              payment_method: 'card',
              payment_id: data?.payment_id,
            });
            await refreshSession();
            onSuccess(email);
        } else if (data.status === 'in_process') {
            toast.info("Pagamento em processamento. Aguarde...");
            setVerifying(true);
        } else {
            toast.error("Pagamento recusado. Verifique os dados.");
            trackEvent(distinctId, 'payment_failed', {
              plan,
              price,
              payment_method: 'card',
              status: data.status,
            });
        }

    } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Erro ao processar pagamento.");
        captureException(e, undefined, { context: 'card_payment', plan, price });
    } finally {
        setLoading(false);
    }
  };

  const handlePix = async () => {
    setLoading(true);
    try {
        // Validate inputs with detailed messages
        const missingFields = [];
        if (!firstName) missingFields.push("Nome");
        if (!lastName) missingFields.push("Sobrenome");
        if (!email) missingFields.push("E-mail");
        if (!cpf) missingFields.push("CPF");

        if (missingFields.length > 0) {
            toast.error(`Preencha os campos obrigatórios: ${missingFields.join(', ')}`);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.functions.invoke('create-payment', {
            body: {
                payment_method_id: 'pix',
                payer: {
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    identification: {
                        type: 'CPF',
                        number: cpf.replace(/\D/g, '') // Send only numbers
                    }
                },
                plan_id: PLAN_CONFIG.PLANS[plan].id // Send the database UUID for the plan
            }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setPixData(data);
        
        // Track Payment ID for polling
        if (data?.payment_id) {
            setCurrentPaymentId(data.payment_id.toString());
            setPollingStartTime(Date.now());
        }

    } catch (e: any) {
        console.error(e);
        toast.error(e.message || "Erro ao gerar PIX.");
        // PostHog: track PIX payment failure
        const { data: { user: currentUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        trackEvent(currentUser?.id || 'anonymous', 'payment_failed', {
          plan,
          price,
          payment_method: 'pix',
          error_message: e.message,
        });
        captureException(e, currentUser?.id, { context: 'pix_payment', plan, price });
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

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- RENDER PIX SCREEN ---
  if (pixData) {
      return (
          <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-foreground">
              {/* Header */}
              <div className="px-6 pt-4 pb-2 flex items-center justify-between">
                <button onClick={onCancel} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white uppercase font-display tracking-tight">Pagamento PIX</h1>
                <div className="w-10"></div>
              </div>

              {/* Progress Steps */}
              <ProgressBar />

              <div className="flex-1 overflow-y-auto px-6 pb-32">
                  {showTimeoutFallback ? (
                        <div className="w-full p-6 bg-white dark:bg-slate-card rounded-2xl shadow-lg border border-yellow-200/50 text-center space-y-4 animate-fade-in">
                            <div className="flex justify-center">
                                <div className="bg-yellow-500/10 p-3 rounded-full">
                                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                                </div>
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Confirmação demorando...</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">
                                A confirmação do pagamento está demorando um pouco mais que o normal.
                            </p>
                            
                            <div className="space-y-2 pt-2">
                                <Button onClick={manualCheck} className="w-full bg-primary hover:bg-blue-700 text-white h-10 text-sm">
                                    <RefreshCw className="mr-2 h-3 w-3" /> Tentar Novamente
                                </Button>
                                <Button variant="outline" className="w-full h-10 text-sm border-gray-200 dark:border-gray-700" asChild>
                                    <a href="mailto:suporte@maximare.com.br" target="_blank" rel="noopener noreferrer">
                                        <LifeBuoy className="mr-2 h-3 w-3" /> Falar com Suporte
                                    </a>
                                </Button>
                            </div>
                        </div>
                  ) : (
                      <div className="space-y-6">
                          <div className="bg-white dark:bg-slate-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
                              <div className="bg-white p-2 rounded-xl shadow-sm mb-4">
                                  <img 
                                    src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} 
                                    alt="QR Code PIX" 
                                    className="w-48 h-48 object-contain"
                                  />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Escaneie o QR Code com seu app de banco</p>
                          </div>

                          <div className="space-y-2">
                              <Label className="text-xs uppercase text-gray-400 font-bold tracking-wider pl-1">Código PIX Copia e Cola</Label>
                              <div className="flex gap-2">
                                  <Input 
                                    value={pixData.qr_code} 
                                    readOnly 
                                    className="text-xs bg-gray-50 dark:bg-graphite font-mono h-12 border-gray-200 dark:border-gray-800" 
                                    onFocus={(e) => e.target.select()}
                                  />
                                  <Button size="icon" variant="outline" onClick={copyToClipboard} className="h-12 w-12 shrink-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-card">
                                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                              </div>
                          </div>

                          <div className="flex items-center justify-center gap-2 text-xs text-primary bg-primary/10 p-3 rounded-lg animate-pulse">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Aguardando confirmação automática...</span>
                          </div>
                          
                          <Button onClick={manualCheck} variant="ghost" className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                              Já realizei o pagamento
                          </Button>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- RENDER MAIN CHECKOUT SCREEN ---
  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark text-foreground">
      
      {/* Header */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white uppercase font-display tracking-tight">Pagamento</h1>
        <button className="p-2 -mr-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <Info className="w-6 h-6" />
        </button>
      </div>

      {/* Progress Steps */}
      <ProgressBar />

      <div className="flex-1 overflow-y-auto px-6 pb-32">
        
        {/* Security Badge */}
        <div className="mb-8">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ShieldCheck className="text-primary h-5 w-5" />
                </div>
                <div>
                    <p className="text-[11px] uppercase tracking-widest text-blue-500 font-bold">Criptografia Segura</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Proteção de dados AES-256 Bit</p>
                </div>
            </div>
        </div>

        {/* Form Fields - Always Visible */}
        <div className="space-y-4 mb-8">
            <p className="text-[12px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-semibold px-1">Seus Dados</p>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Nome</Label>
                        <Input 
                            value={firstName} 
                            onChange={(e) => setFirstName(e.target.value)} 
                            className="bg-gray-50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 rounded-xl h-12 text-gray-900 dark:text-white focus:ring-primary/50"
                            placeholder="Seu nome"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-500">Sobrenome</Label>
                        <Input 
                            value={lastName} 
                            onChange={(e) => setLastName(e.target.value)} 
                            className="bg-gray-50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 rounded-xl h-12 text-gray-900 dark:text-white focus:ring-primary/50"
                            placeholder="Seu sobrenome"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Email</Label>
                    <Input 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="bg-gray-50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 rounded-xl h-12 text-gray-900 dark:text-white focus:ring-primary/50"
                        placeholder="seu@email.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-gray-500">CPF (apenas números)</Label>
                    <Input 
                        value={cpf} 
                        onChange={(e) => setCpf(e.target.value)} 
                        className="bg-gray-50 dark:bg-zinc-900/50 border-gray-200 dark:border-zinc-800 rounded-xl h-12 text-gray-900 dark:text-white focus:ring-primary/50"
                        placeholder="000.000.000-00"
                    />
                </div>
            </div>
        </div>

        {/* Method Selection - Cards Style */}
        <div className="space-y-4 mb-8">
            <p className="text-[12px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-semibold px-1">Método de Pagamento</p>
            
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all h-32 ${
                        paymentMethod === 'card' 
                        ? 'bg-white dark:bg-slate-card border-blue-500 shadow-lg shadow-blue-500/20' 
                        : 'bg-white dark:bg-slate-card border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                >
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-900 dark:bg-black rounded-xl text-white mb-3">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xs text-gray-900 dark:text-white">Cartão</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">Aprovação imediata</p>
                    </div>
                    <div className={`mt-2 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === 'card' ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                        {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                </button>

                <button 
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all h-32 ${
                        paymentMethod === 'pix' 
                        ? 'bg-white dark:bg-slate-card border-blue-500 shadow-lg shadow-blue-500/20' 
                        : 'bg-white dark:bg-slate-card border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                >
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-900 dark:bg-black rounded-xl text-white mb-3">
                        <QrCode className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-xs text-gray-900 dark:text-white">PIX</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">Instantâneo</p>
                    </div>
                     <div className={`mt-2 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === 'pix' ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                        {paymentMethod === 'pix' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                </button>
            </div>
        </div>

        <div className="h-[1px] bg-gray-100 dark:bg-zinc-800 my-4"></div>

        {/* Payment Action Section */}
        <div className="space-y-6">
            
            {/* PIX Section */}
            <div className={paymentMethod === 'pix' ? 'block space-y-4 animate-fade-in' : 'hidden'}>
                <div className="bg-blue-500/10 rounded-xl p-4 flex items-start gap-3">
                    <div className="bg-blue-500 rounded-full p-1 mt-0.5">
                        <Check className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-blue-500">Pagamento Instantâneo</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Seu acesso será liberado imediatamente após o pagamento.
                        </p>
                    </div>
                </div>

                <Button 
                    onClick={handlePix} 
                    disabled={loading}
                    className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-500/20 mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Gerar PIX de R$ ${price.toFixed(2)}`}
                </Button>
            </div>

            {/* Card Section */}
            {paymentMethod === 'card' && (
                <div className="space-y-4 animate-fade-in">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">Cartão de crédito ou débito</p>
                    {/* Card Form handled by Brick */}
                    <div className="bg-transparent dark:bg-transparent rounded-2xl p-1 border-none min-h-[300px]">
                        {sdkReady ? (
                            <CardPayment
                                initialization={initialization}
                                customization={customization}
                                onSubmit={handleCardSubmit}
                                onReady={() => setReady(true)}
                                onError={(error) => {
                                    console.error('Brick Error:', error);
                                    toast.error("Erro ao carregar formulário de pagamento.");
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};
