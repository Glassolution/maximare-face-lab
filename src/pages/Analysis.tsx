import { useState, useRef, useCallback, useEffect, useMemo, type ComponentType } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import {
  Camera,
  Upload,
  Loader2,
  X,
  Scan,
  Zap,
  Settings,
  ArrowUp,
  PersonStanding,
  Info,
  User,
  TrendingUp,
  Trash2,
  Clock,
} from "lucide-react";
import { usePaywallGate } from "@/hooks/usePaywallGate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveAnalysis, getAnalysisHistory, deleteAnalysis, syncHistoryWithSupabase, type AnalysisResult } from "@/lib/mockData";
import { generateExtendedMockAnalysis, getTier, getMindset, getStrategy, type ExtendedAnalysisResult } from "@/lib/rankingSystem";
import { generatePersonalizedPlan } from "@/lib/smartTrendsEngine";
import faceScanHero from "@/assets/clark.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, captureException } from "@/lib/posthog";
import { avatarService } from "@/services/avatarService";

function CircularScore({ score, delta, ringColor }: { score: number; delta: number; ringColor: string }) {
  const springValue = useSpring(0, { stiffness: 40, damping: 20 });
  
  useEffect(() => {
    springValue.set(score);
  }, [score, springValue]);

  const displayValue = useTransform(springValue, (latest) => latest.toFixed(1));
  
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  
  const strokeDashoffset = useTransform(springValue, (latest) => {
    const progress = Math.max(0, Math.min(100, latest)) / 100;
    return circumference - (progress * circumference);
  });

  return (
    <div className="relative h-44 w-44 flex items-center justify-center">
      {/* Background Circle */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="88"
          cy="88"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-muted/30"
        />
        {/* Progress Circle */}
        <motion.circle
          cx="88"
          cy="88"
          r={radius}
          stroke={ringColor}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Inner Content */}
      <div className="flex flex-col items-center justify-center z-10 relative">
        <p className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground uppercase px-3 text-center mb-1">
          Overall Score
        </p>
        <motion.p className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
          {displayValue}
        </motion.p>
        <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted border border-border text-[10px] font-semibold text-primary">
          <TrendingUp className="h-3 w-3" />
          <span>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} pts
          </span>
        </div>
      </div>
      
      {/* Glow Effect */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: ringColor }}
      />
    </div>
  );
}

import { useAnalysisLimit } from "@/hooks/useAnalysisLimit";
import { PaywallManager } from "@/components/paywall/PaywallManager";
import { LimitTimer } from "@/components/paywall/LimitTimer";

export default function Analysis() {
  const navigate = useNavigate();
  const { checkGate, PaywallDialog, isPaywallOpen } = usePaywallGate();
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DISABLE_LIMITS = import.meta.env.VITE_DISABLE_LIMITS === "1";

  // Analysis Limit Hook
  const { canAnalyze, nextAvailableAt, isPremium, logEvent, checkLimit } = useAnalysisLimit();

  const [showCapture, setShowCapture] = useState(false);
  const [captureStep, setCaptureStep] = useState<"intro-hero" | "intro" | "front-instruction" | "front-capture" | "side-instruction" | "side-capture" | "analyzing">("intro");
  const [mode, setMode] = useState<"idle" | "webcam" | "uploaded">("idle");
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ remainingAttempts: number; resetInSeconds: number } | null>(null);
  const lastAttemptRef = useRef<number>(0);
  const [usageStatus, setUsageStatus] = useState<{ limit: number; used: number; remaining: number; resetAt?: string } | null>(null);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const cooldownTimerRef = useRef<number | null>(null);
  const [limitsDisabled, setLimitsDisabled] = useState(DISABLE_LIMITS);

  const { user, session, profile } = useAuth();

  useEffect(() => {
    const sync = async () => {
      if (user) {
        const synced = await syncHistoryWithSupabase();
        if (synced && synced.length > 0) {
          setHistory(synced);
        } else {
          setHistory(getAnalysisHistory());
        }
      }
    };
    sync();
  }, [user]);

  useEffect(() => {
    if (searchParams.get("start") === "true") {
      setShowCapture(true);
      setCaptureStep("intro-hero");
    }
  }, [searchParams]);

  useEffect(() => {
    if (limitsDisabled) return;
    const endAtStr = localStorage.getItem("cooldown_end_at");
    if (!endAtStr) return;
    const endAt = Number(endAtStr);
    const now = Date.now();
    if (endAt > now) {
      const remaining = Math.ceil((endAt - now) / 1000);
      startCooldown(remaining);
    } else {
      localStorage.removeItem("cooldown_end_at");
    }
  }, []);

  const [history, setHistory] = useState<AnalysisResult[]>(() => getAnalysisHistory());
  const lastAnalysis = history.length > 0 ? history[0] : null;
  const currentGER = lastAnalysis
    ? (lastAnalysis as ExtendedAnalysisResult).ger ?? Math.round(lastAnalysis.overallScore * 10)
    : 0;
  const streak = Math.max(history.length, 1);
  const weekDelta = history.length > 1 ? +(history[0].overallScore - history[1].overallScore).toFixed(1) : 0;
  const ringColor =
    currentGER < 55
      ? "rgb(248,113,113)"  // vermelho - zona crítica
      : currentGER < 75
      ? "rgb(250,204,21)"   // amarelo - intermediário
      : "rgb(59,130,246)";  // azul - bom/ótimo

  const plan = useMemo(() => generatePersonalizedPlan(), [history.length]);
  const primaryTrend = plan.hasAnalysis && plan.trends.length > 0 ? plan.trends[0] : null;
  const primaryBottleneck = plan.hasAnalysis && plan.bottlenecks.length > 0 ? plan.bottlenecks[0] : null;

  const handleDeleteHistory = async (id: string) => {
    await deleteAnalysis(id);
    setHistory(getAnalysisHistory());
  };

  const formatHistoryDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  useEffect(() => {
    const loadUsage = async () => {
      if (limitsDisabled) { setUsageStatus(null); return; }
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-face`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          },
          body: JSON.stringify({ checkOnly: true }),
        });
        const data = await resp.json();
        if (data?.limits_disabled) {
          setLimitsDisabled(true);
          setUsageStatus(null);
          return;
        }
        if (typeof data?.attempts_remaining === "number") {
          setUsageStatus({ limit: data.limit ?? 3, used: 0, remaining: data.attempts_remaining });
        }
      } catch {
        // ignore usage display errors
      }
    };
    loadUsage();
  }, [user, showCapture]);

  // Handle post-paywall navigation
  useEffect(() => {
    if (!isPaywallOpen && pendingNavigation) {
      navigate(pendingNavigation, {
        state: { photoUrl: frontPhoto },
      });
      setPendingNavigation(null);
    }
  }, [isPaywallOpen, pendingNavigation, navigate, frontPhoto]);

  const startCooldown = (seconds: number) => {
    if (limitsDisabled) return;
    if (seconds <= 0) return;
    setIsCooldownActive(true);
    setCooldownRemaining(seconds);
    localStorage.setItem("cooldown_end_at", String(Date.now() + seconds * 1000));
    if (cooldownTimerRef.current) {
      window.clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (cooldownTimerRef.current) {
            window.clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          setIsCooldownActive(false);
          localStorage.removeItem("cooldown_end_at");
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const startWebcam = useCallback(async () => {
    if (!limitsDisabled && isCooldownActive) {
      setErrorMsg(`Aguarde ${cooldownRemaining}s para nova análise.`);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      setStream(s);
      setMode("webcam");
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      }, 100);
    } catch { alert("Não foi possível acessar a câmera."); }
  }, [limitsDisabled, isCooldownActive, cooldownRemaining]);

  const stopWebcam = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    
    if (captureStep === "front-capture") {
      setFrontPhoto(dataUrl);
      stopWebcam();
      setMode("uploaded");
    } else if (captureStep === "side-capture") {
      setSidePhoto(dataUrl);
      stopWebcam();
      setMode("uploaded");
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (captureStep === "front-capture") {
        setFrontPhoto(dataUrl);
        setMode("uploaded");
      } else if (captureStep === "side-capture") {
        setSidePhoto(dataUrl);
        setMode("uploaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    if (captureStep === "front-capture") setFrontPhoto(null);
    if (captureStep === "side-capture") setSidePhoto(null);
    setMode("idle");
    stopWebcam();
  };

  const nextStep = () => {
    if (!canAnalyze && captureStep === "intro") {
        return; // Button is disabled or replaced by timer
    }

    if (!limitsDisabled && isCooldownActive) {
      setErrorMsg(`Aguarde ${cooldownRemaining}s para nova análise.`);
      return;
    }
    if (captureStep === "intro") setCaptureStep("front-instruction");
    else if (captureStep === "front-instruction") {
      setCaptureStep("front-capture");
      setMode("idle");
    }
    else if (captureStep === "front-capture" && frontPhoto) {
      setCaptureStep("side-instruction");
      setMode("idle");
    }
    else if (captureStep === "side-instruction") {
      setCaptureStep("side-capture");
      setMode("idle");
    }
    else if (captureStep === "side-capture" && sidePhoto) {
      handleAnalyze();
    }
  };

  const validatePhoto = (dataUrl: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(true); return; }
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let darkPixels = 0;
        const totalPixels = imageData.data.length / 4;
        
        for (let i = 0; i < imageData.data.length; i += 4 * 10) {
            const r = imageData.data[i];
            const g = imageData.data[i+1];
            const b = imageData.data[i+2];
            const brightness = (r + g + b) / 3;
            if (brightness < 30) darkPixels++;
        }
        
        if (darkPixels / (totalPixels / 10) > 0.5) resolve(false);
        else resolve(true);
      };
      img.src = dataUrl;
    });
  };

  const handleAnalyze = async () => {
    if (!limitsDisabled && isCooldownActive) {
      setErrorMsg(`Aguarde ${cooldownRemaining}s para nova análise.`);
      return;
    }
    const now = Date.now();
    if (now - (lastAttemptRef.current || 0) < 3000) {
      setErrorMsg("Aguarde alguns segundos antes de tentar novamente.");
      return;
    }
    lastAttemptRef.current = now;
    setErrorMsg(null);
    setCaptureStep("analyzing");

    // PostHog: track analysis started
    const distinctId = user?.id || 'anonymous';
    trackEvent(distinctId, 'face_analysis_started', {
      has_front_photo: !!frontPhoto,
      has_side_photo: !!sidePhoto,
      is_premium: isPremium,
    });
    
    if (!frontPhoto || !sidePhoto) {
        setErrorMsg("Erro: Fotos faltando. Por favor, forneça ambas as fotos.");
        setCaptureStep("intro");
        return;
    }

    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Tempo limite excedido (15s)")), 15000)
        );

        const validationPromise = (async () => {
            const isFrontValid = await validatePhoto(frontPhoto);
            const isSideValid = await validatePhoto(sidePhoto);
            if (!isFrontValid || !isSideValid) {
                throw new Error("As fotos estão muito escuras ou sem qualidade. Tente novamente em um ambiente iluminado.");
            }
            return true;
        })();

        await Promise.race([validationPromise, timeoutPromise]);

        const analysisPromise = (async () => {
            await new Promise((r) => setTimeout(r, 1200));
            const localResult = generateExtendedMockAnalysis();
            try {
              const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-face`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
                },
                body: JSON.stringify({ frontalImage: frontPhoto, lateralImage: sidePhoto }),
              });
              const data = await resp.json();

              // If backend signals limits are disabled, update local state
              if (data?.limits_disabled) {
                setLimitsDisabled(true);
                setUsageStatus(null);
                setIsCooldownActive(false);
                setCooldownRemaining(0);
                localStorage.removeItem("cooldown_end_at");
              }

              if (!resp.ok) {
                if (data?.limits_disabled) {
                  // ignore limit errors when disabled
                } else if (data?.error_code === "QUOTA_EXCEEDED") {
                  setLimitInfo({
                    remainingAttempts: data.remaining ?? 0,
                    resetInSeconds: data.reset_in_seconds ?? 0,
                  });
                  throw new Error(data.message || "Você atingiu o limite de análises por hoje.");
                } else if (data?.error_code === "RATE_LIMIT") {
                  const retry = Number(data?.retry_after_seconds) || 15;
                  startCooldown(retry);
                  throw new Error(`Aguarde ${retry}s para nova análise.`);
                } else {
                  throw new Error(data?.message || "Erro na análise. Tente novamente.");
                }
              }
              if (data?.isValidFace === false) {
                throw new Error(data?.reason || "Imagem inválida. Envie uma foto clara do seu rosto.");
              }
              // Only start cooldown if limits are NOT disabled
              if (!data?.limits_disabled && typeof data?.cooldown_seconds === "number" && data.cooldown_seconds > 0) {
                startCooldown(Number(data.cooldown_seconds));
              }

              const secondary = data.secondaryScore ?? Math.floor(data.ger / 10);
              const mapped: ExtendedAnalysisResult = {
                ...localResult,
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                overallScore: secondary,
                ger: data.ger,
                tier: data.tier,
                mindset: getMindset(data.ger),
                strategy: getStrategy(data.ger),
                secondaryScore: secondary,
                photoSideUrl: sidePhoto || undefined,
                nextTier: data.nextTier?.name,
                pointsToNextTier: data.nextTier?.pointsNeeded ?? 0,
                technicalBreakdown: data.technicalBreakdown,
                breathing: data.technicalBreakdown?.breathing,
                // MAP BACKEND ATTRIBUTES TO CATEGORIES
                categories: data.attributes ? data.attributes.map((attr: any) => ({
                    id: attr.id,
                    name: attr.name,
                    score: attr.score,
                    icon: attr.icon,
                    // Derive color/desc from score if not provided by backend, or use defaults
                    color: attr.score >= 80 ? "green" : attr.score >= 60 ? "yellow" : "red",
                    description: attr.score >= 80 ? "Ponto forte" : attr.score >= 60 ? "Média" : "Ponto de atenção",
                    flaws: [],
                    strengths: []
                })) : localResult.categories
              };
              return mapped;
            } catch (err) {
              if (err instanceof Error && /limite|quota|tentativas/i.test(err.message)) {
                throw err;
              }
              return localResult;
            }
        })();

        const result = (await Promise.race([analysisPromise, timeoutPromise])) as ExtendedAnalysisResult;

        if (frontPhoto) result.photoUrl = frontPhoto;
        if (sidePhoto) result.photoSideUrl = sidePhoto;
        
        await saveAnalysis(result);

        // PostHog: track analysis completed
        trackEvent(distinctId, 'face_analysis_completed', {
          ger: result.ger,
          tier: result.tier,
          overall_score: result.overallScore,
          is_premium: isPremium,
        });

        // Handle Battle Context
        const battleId = searchParams.get("battleId");
        if (battleId && user) {
            try {
                // 1. Upload Photo
                let publicUrl = null;
                if (frontPhoto) {
                    const res = await fetch(frontPhoto);
                    const blob = await res.blob();
                    const fileName = `${battleId}/${user.id}.jpg`;
                    
                    // Attempt upload to 'battle-images' bucket
                    const { error: uploadError } = await supabase.storage
                        .from('battle-images')
                        .upload(fileName, blob, { upsert: true });
                    
                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from('battle-images')
                            .getPublicUrl(fileName);
                        publicUrl = urlData.publicUrl;
                    } else {
                        console.warn("Could not upload battle image:", uploadError);
                    }
                }

                // 2. Update Battle Photo URL if successful
                if (publicUrl) {
                    await supabase.rpc('update_battle_photo', { 
                        battle_id: battleId, 
                        photo_url: publicUrl 
                    });
                }

                // 3. Submit Move
                const { data: battleData, error: battleError } = await supabase.rpc('submit_battle_move', { 
                    battle_id: battleId, 
                    analysis_id: result.id 
                });
                
                if (battleError) throw battleError;
                if (battleData && !battleData.success) throw new Error(battleData.error);
                
                navigate("/battles");
                return;
            } catch (err: any) {
                console.error("Error submitting battle move:", err);
                setErrorMsg(err.message || "Erro ao enviar resultado para o duelo.");
                setCaptureStep("intro");
                return;
            }
        }

        // Check paywall gate
        const targetPath = `/results/${result.id}`;
        
        if (isPremium) {
          // Usuário premium pode ver resultados sem restrição
          navigate(targetPath);
          return;
        }
        
        const allowed = await checkGate({ trigger: 'analysis_completed' });

        if (allowed) {
          navigate(targetPath, {
            state: { photoUrl: frontPhoto },
          });
        } else {
          setPendingNavigation(targetPath);
        }

    } catch (error: unknown) {
        console.error("Erro na análise:", error);
        // PostHog: track analysis failure and capture exception
        trackEvent(distinctId, 'face_analysis_failed', {
          error_message: error instanceof Error ? error.message : String(error),
          is_premium: isPremium,
        });
        captureException(error, distinctId, { context: 'face_analysis' });
    } finally {
        if (captureStep === "analyzing") {
          // Log Event after successful analysis
          if (!errorMsg) {
             logEvent('app');
          }
          setCaptureStep("intro");
        }
    }
  };

  interface InstructionScreenProps {
    title: string;
    text: string;
    icon: ComponentType<{ className?: string }>;
    onNext: () => void;
    image?: boolean;
  }

  const InstructionScreen = ({ title, text, icon: Icon, onNext, image }: InstructionScreenProps) => (
    <div className="flex flex-col items-center text-center justify-between h-full py-8">
      <div className="flex flex-col items-center gap-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground max-w-xs">{text}</p>
        {image && (
            <div className="w-32 h-40 bg-muted rounded-2xl flex items-center justify-center opacity-50">
                <span className="text-xs">Exemplo</span>
            </div>
        )}
        <div className="flex flex-col gap-2 text-sm text-left bg-secondary/30 p-4 rounded-xl">
            <div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-green-500" /> Boa iluminação</div>
            <div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-green-500" /> Sem filtros/óculos</div>
            <div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-green-500" /> Rosto limpo</div>
        </div>
      </div>
      <Button onClick={onNext} className="w-full max-w-xs rounded-2xl py-6 text-base glow-primary">
        Entendi, vamos lá
      </Button>
    </div>
  );

  // Capture overlay
  if (showCapture) {
    return (
      <div className="min-h-screen pt-6 pb-24 px-4 bg-background">
        <div className="container max-w-lg mx-auto h-[80vh]">
            <div className="flex justify-between items-center mb-4">
                <Button 
                    size="sm" 
                    onClick={() => setShowCapture(false)}
                    className="bg-blue-500 hover:bg-blue-600 text-white border-none rounded-xl h-10 w-10 p-0 shadow-sm"
                >
                    <X className="h-5 w-5" />
                </Button>
                <span className="text-sm font-bold text-muted-foreground">
                    {captureStep === "analyzing" ? "Analisando" : 
                     captureStep.includes("front") ? "1/2: Frente" : 
                     captureStep.includes("side") ? "2/2: Lateral" : "Instruções"}
                </span>
                <div className="min-w-[80px] text-right">
                  {!limitsDisabled && usageStatus && typeof usageStatus.remaining === "number" && (
                    <span className="text-[11px] font-bold text-primary">
                      Restam {usageStatus.remaining}
                    </span>
                  )}
                </div>
            </div>

            {errorMsg && captureStep === "intro" && (
                <div className="mb-4 mx-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                    <Info className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{errorMsg}</p>
                </div>
            )}

            {captureStep === "intro-hero" && (
                <div className="flex flex-col items-center h-full pt-8 pb-20 relative">
                    <div className="flex flex-col items-center justify-start w-full relative">
                        <div className="w-full flex justify-between items-center px-4 mb-4">
                            <h1 className="text-xl font-bold font-heading">Análise Facial</h1>
                            <Settings className="h-6 w-6 text-muted-foreground" />
                        </div>
                        
                        <div className="relative w-full max-w-[240px] aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl">
                            <img src={faceScanHero} alt="Face Scan" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="w-[90%] h-[90%] border border-white/20 rounded-[1.5rem] relative overflow-hidden">
                                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-8 opacity-20">
                                        {Array.from({ length: 48 }).map((_, i) => (
                                            <div key={i} className="border-[0.5px] border-white/30" />
                                        ))}
                                    </div>
                                    <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                                 </div>
                            </div>
                            
                            <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                                <h2 className="text-lg font-bold text-white mb-2 font-heading leading-tight">Receba suas notas e recomendações</h2>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 w-full flex flex-col justify-end items-center pb-2">
                        <div className="w-full max-w-[260px] px-4 space-y-4">
                            <Button onClick={() => setCaptureStep("front-instruction")} className="w-full rounded-full py-5 text-base font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] glow-primary transition-transform active:scale-95">
                                Iniciar análise
                            </Button>
                            
                            <div className="flex justify-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <div className="w-2 h-2 rounded-full bg-primary/20" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(captureStep === "front-instruction" || captureStep === "intro") && (
                <div className="flex flex-col h-full justify-between">
                    <InstructionScreen 
                        title="Foto Frontal" 
                        text="Segure o celular na altura dos olhos. Olhe diretamente para a câmera. Mantenha a expressão neutra."
                        icon={Scan}
                        onNext={() => { setErrorMsg(null); setCaptureStep("front-capture"); setMode("idle"); }}
                    />
                    
                    {/* Limit Enforcer */}
                    {captureStep === "intro" && !canAnalyze && !isPremium && (
                        <div className="absolute bottom-28 left-0 right-0 px-6 z-20">
                            <div className="bg-background/80 backdrop-blur-md p-4 rounded-xl border border-amber-500/30 shadow-lg text-center space-y-3">
                                <LimitTimer nextAvailableAt={nextAvailableAt} />
                                <Button 
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 font-bold"
                                    onClick={() => navigate('/profile')}
                                >
                                    Desbloquear Ilimitado
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {captureStep === "side-instruction" && (
                <InstructionScreen 
                    title="Foto Lateral" 
                    text="Vire o rosto 90 graus para a esquerda ou direita. Mantenha o queixo paralelo ao chão."
                    icon={PersonStanding}
                    onNext={nextStep}
                />
            )}

            {(captureStep === "front-capture" || captureStep === "side-capture") && (
                <div className="flex flex-col h-full items-center">
                    <div className="relative aspect-[3/4] w-full max-w-[280px] mx-auto rounded-3xl border border-border/30 glass overflow-hidden mb-4 shadow-lg">
                        <AnimatePresence mode="wait">
                            {mode === "webcam" ? (
                                <motion.div key="webcam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-40 h-56 border-2 border-dashed border-primary/40 rounded-[50%]" />
                                </div>
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                    <button onClick={capturePhoto} className="h-14 w-14 rounded-full bg-primary glow-primary flex items-center justify-center">
                                    <Camera className="h-6 w-6 text-primary-foreground" />
                                    </button>
                                </div>
                                </motion.div>
                            ) : (captureStep === "front-capture" ? frontPhoto : sidePhoto) ? (
                                <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                <img src={captureStep === "front-capture" ? frontPhoto! : sidePhoto!} alt="" className="h-full w-full object-cover" />
                                <button onClick={clearPhoto} className="absolute top-3 right-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 shadow-lg">
                                    <X className="h-4 w-4" />
                                </button>
                                </motion.div>
                            ) : (
                                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                                >
                                <div className="w-40 h-56 border-2 border-dashed border-border/50 rounded-[50%] flex items-center justify-center">
                                    <Camera className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                                <p className="text-[10px] text-muted-foreground">Arraste ou use as opções abaixo</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                    
                    {!(captureStep === "front-capture" ? frontPhoto : sidePhoto) && mode !== "webcam" && (
                        <div className="flex flex-col gap-2 max-w-[280px] mx-auto w-full mb-20">
                            <Button onClick={startWebcam} className="gap-2 rounded-xl py-5 glow-sm bg-blue-500 hover:bg-blue-600 text-white border-none text-sm">
                                <Camera className="h-4 w-4 shrink-0" /> <span className="truncate">Usar câmera</span>
                            </Button>
                            <Button variant="outline" className="gap-2 rounded-xl py-5 glass border-blue-500/30 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-sm" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4 shrink-0" /> <span className="truncate">Enviar foto</span>
                            </Button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                        </div>
                    )}

                    {(captureStep === "front-capture" ? frontPhoto : sidePhoto) && (
                        <div className="max-w-[280px] mx-auto w-full space-y-2 mb-20">
                            <Button className="w-full rounded-xl py-5 text-sm font-semibold glow-primary" onClick={nextStep}>
                                <Zap className="h-4 w-4 mr-2" /> {captureStep === "side-capture" ? "Finalizar Análise" : "Próxima Foto"}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {captureStep === "analyzing" && (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                     <div className="h-24 w-24 rounded-full glow-primary flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                     </div>
                     <div className="space-y-2 text-center">
                        <h2 className="text-2xl font-heading font-bold">Processando IA</h2>
                        <p className="text-muted-foreground">Calculando simetria e proporções...</p>
                     </div>
                     <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden mt-4">
                        <motion.div 
                            className="h-full bg-primary" 
                            initial={{ width: "0%" }} 
                            animate={{ width: "100%" }} 
                            transition={{ duration: 3, ease: "easeInOut" }} 
                        />
                     </div>
                </div>
            )}
        </div>
            {/* Quota Modal (Capture overlay) */}
            {!limitsDisabled && limitInfo && (
              <Dialog open={true} onOpenChange={(v) => !v && setLimitInfo(null)}>
                <DialogContent className="rounded-2xl border-border/50 bg-card max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-lg">Limite de 24h atingido</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">Reset em: {limitInfo.resetInSeconds}s</p>
                  </div>
                  <div className="grid gap-2 mt-3">
                    <Button className="rounded-xl" onClick={() => setLimitInfo(null)}>
                      Ok
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      Assistir anúncio para +1 análise
                    </Button>
                    <Button
                      className="rounded-xl"
                      onClick={() => {
                        setLimitInfo(null);
                        navigate("/profile");
                      }}
                    >
                      Assinar Premium
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
        </div>
      );
  }

  // ───────── DASHBOARD ─────────

  const displayName = (user && (user.user_metadata?.full_name || user.user_metadata?.name || user.email)) || "Usuário MAXIMARE";
  const avatarUrl = avatarService.getAvatarPublicUrl(profile?.avatar_url);

  return (
    <PaywallManager trigger="app_open">
        <div className="min-h-screen pt-6 pb-28 px-4 bg-background">
        <div className="container max-w-lg mx-auto space-y-8">

            {/* Header / Top Bar */}
            <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar do usuário" 
                className="size-10 rounded-full object-cover border-2 border-white/10 shadow-lg shadow-primary/20"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            {!avatarUrl && (
              <div className="size-10 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center border border-white/10 shadow-lg shadow-primary/20">
               <User className="text-white h-5 w-5" />
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Membro Elite</p>
              <h2 className="text-sm font-bold text-foreground">{displayName}</h2>
            </div>
          </div>
          <button onClick={() => setShowSettings(true)} className="size-10 rounded-lg flex items-center justify-center bg-card border border-border text-foreground hover:bg-muted transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 pt-4 pb-24 space-y-8">
          {/* Hero Score Section - circular score + delta */}
          <section className="pt-4 pb-2 flex flex-col items-center gap-6">
            <CircularScore 
              score={currentGER} 
              delta={weekDelta} 
              ringColor={ringColor} 
            />
          </section>

          {/* IA Insights - Foco Atual / Trends */}
          {primaryTrend && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-muted">
                  Foco atual da IA
                </p>
                <button
                  onClick={() => navigate("/trends")}
                  className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Ver plano
                </button>
              </div>
              <div className="rounded-2xl bg-graphite border border-slate-custom px-4 py-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                      {primaryBottleneck ? primaryBottleneck.area : "Plano de Evolução"}
                    </p>
                    <h3 className="text-sm font-bold text-white mt-1">{primaryTrend.title}</h3>
                    <p className="text-xs text-text-muted mt-1 line-clamp-2">
                      {primaryTrend.subtitle}
                    </p>
                    {weekDelta !== 0 && (
                      <p className="mt-2 text-[10px] text-text-muted">
                        Progresso recente:{" "}
                        <span className={weekDelta >= 0 ? "text-green-400" : "text-red-400"}>
                          {weekDelta >= 0 ? "+" : ""}
                          {weekDelta.toFixed(1)} pts na Aura
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                {primaryBottleneck && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-white/5 text-text-muted">
                      {primaryBottleneck.priority === "critica"
                        ? "Crítico"
                        : primaryBottleneck.priority === "alta"
                        ? "Alta"
                        : "Média"}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {Math.round(primaryBottleneck.score)}/99
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* CTA Card */}
          <section className="space-y-4">
            <button
              onClick={() => {
                if (!canAnalyze) {
                    navigate('/profile'); // Redirect to paywall/upgrade
                    return;
                }
                
                if (!limitsDisabled && isCooldownActive) {
                  setErrorMsg(`Aguarde ${cooldownRemaining}s para nova análise.`);
                  return;
                }
                setShowCapture(true);
                setCaptureStep("intro-hero");
              }}
              disabled={(!limitsDisabled && isCooldownActive) || (!canAnalyze && !isPremium)}
              className={`w-full rounded-2xl px-5 py-4 flex items-center justify-between shadow-[0_18px_40px_rgba(0,0,0,0.75)] border ${
                (!limitsDisabled && isCooldownActive) || !canAnalyze
                  ? "bg-zinc-900 border-zinc-800 cursor-not-allowed"
                  : "bg-white border-white/10 hover:bg-zinc-50"
              } transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                    (!limitsDisabled && isCooldownActive) || !canAnalyze ? "bg-zinc-800" : "bg-black"
                  }`}
                >
                  { !canAnalyze && !isPremium ? <Clock className="h-5 w-5 text-amber-500" /> : <Scan className={`h-5 w-5 ${(!limitsDisabled && isCooldownActive) ? "text-zinc-500" : "text-white"}`} /> }
                </div>
                <div className="text-left">
                  <p className={`text-xs font-semibold ${
                    !canAnalyze && !isPremium ? "text-amber-500" : ((!limitsDisabled && isCooldownActive) ? "text-zinc-500" : "text-black")
                  }`}>
                    {!canAnalyze && !isPremium ? "Limite Diário Atingido" : (!limitsDisabled && isCooldownActive ? "Cooldown ativo" : "Nova Análise")}
                  </p>
                  <p className={`text-[11px] ${
                    !canAnalyze && !isPremium ? "text-zinc-400" : ((!limitsDisabled && isCooldownActive) ? "text-zinc-600" : "text-black/60")
                  }`}>
                    {!canAnalyze && !isPremium
                      ? "Volte amanhã ou vire Premium"
                      : (!limitsDisabled && isCooldownActive
                        ? `Aguarde ${cooldownRemaining}s para nova captura`
                        : "Capturar métricas faciais de alta precisão")}
                  </p>
                </div>
              </div>
              
              {/* Timer or Arrow */}
              { !canAnalyze && !isPremium ? (
                  <div className="text-amber-600 font-mono text-xs font-bold bg-amber-100 px-2 py-1 rounded">
                      <LimitTimer nextAvailableAt={nextAvailableAt} />
                  </div>
              ) : (
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center border ${
                      (!limitsDisabled && isCooldownActive)
                        ? "border-zinc-700 text-zinc-500"
                        : "border-black/10 text-black"
                    }`}
                  >
                    <ArrowUp className="h-3 w-3 -rotate-45" />
                  </div>
              )}
            </button>
          </section>

          {/* Recent Analyses List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight uppercase text-text-muted">Histórico Recente</h3>
              <button onClick={() => navigate('/progress')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">Ver tudo</button>
            </div>
            <div className="space-y-3">
              {history.slice(0, 3).map((analysis, idx) => {
                const extended = analysis as unknown as ExtendedAnalysisResult;
                const ger = extended.ger ?? Math.round(analysis.overallScore * 10);
                const tierInfo = getTier(ger);
                const tierLabel = tierInfo.label || tierInfo.name;

                return (
                  <div
                    key={analysis.id || idx}
                    className="glass-card rounded-xl p-4 flex items-center justify-between border-l-2 border-l-primary hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/results/${analysis.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-lg bg-slate-custom flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                        {analysis.photoUrl ? (
                          <img className="w-full h-full object-cover opacity-80" src={analysis.photoUrl} alt="Analysis" />
                        ) : (
                          <Scan className="h-6 w-6 text-text-muted relative z-20" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-text-muted font-medium">{formatHistoryDate(analysis.date)}</p>
                        <h4 className="text-sm font-bold text-white">Análise Facial</h4>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xl font-bold text-white">
                        {ger.toFixed(2)}
                      </p>
                      <span className="text-[10px] text-text-muted font-bold uppercase">
                        {tierLabel}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistory(analysis.id);
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {history.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                    Nenhuma análise recente.
                </div>
              )}
            </div>
          </section>
        </main>
        {/* Quota Modal (Dashboard) */}
        {!limitsDisabled && limitInfo && (
          <Dialog open={true} onOpenChange={(v) => !v && setLimitInfo(null)}>
            <DialogContent className="rounded-2xl border-border/50 bg-card max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">Limite de 24h atingido</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Reset em: {limitInfo.resetInSeconds}s</p>
              </div>
              <div className="grid gap-2 mt-3">
                <Button className="rounded-xl" onClick={() => setLimitInfo(null)}>
                  Ok
                </Button>
                <Button variant="outline" className="rounded-xl">
                  Assistir anúncio para +1 análise
                </Button>
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setLimitInfo(null);
                    navigate("/profile");
                  }}
                >
                  Assinar Premium
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="rounded-2xl border-border/50 bg-card max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">Configurações</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSettings(false);
                  navigate("/profile");
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <span className="text-sm font-medium">Ver perfil</span>
                <User className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  navigate("/progress");
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <span className="text-sm font-medium">Progresso</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setShowSettings(false);
                  navigate("/login", { replace: true });
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
              >
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
        <PaywallDialog />
      </div>
    </div>
    </PaywallManager>
  );
}
