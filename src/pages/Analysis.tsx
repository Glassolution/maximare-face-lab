import { useState, useRef, useCallback, useEffect, type ComponentType } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, Loader2, X, Scan, Zap, Settings,
  ArrowUp, PersonStanding, Info,
  User, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveAnalysis, getAnalysisHistory } from "@/lib/mockData";
import { generateExtendedMockAnalysis, getTier, type ExtendedAnalysisResult } from "@/lib/rankingSystem";
import faceScanHero from "@/assets/clark.png";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

export default function Analysis() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCapture, setShowCapture] = useState(false);
  const [captureStep, setCaptureStep] = useState<"intro-hero" | "intro" | "front-instruction" | "front-capture" | "side-instruction" | "side-capture" | "analyzing">("intro");
  const [mode, setMode] = useState<"idle" | "webcam" | "uploaded">("idle");
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ limit: number; remaining: number; resetAt: string } | null>(null);
  const lastAttemptRef = useRef<number>(0);
  const [usageStatus, setUsageStatus] = useState<{ limit: number; used: number; remaining: number; resetAt?: string } | null>(null);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const cooldownTimerRef = useRef<number | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (searchParams.get("start") === "true") {
      setShowCapture(true);
      setCaptureStep("intro-hero");
    }
  }, [searchParams]);

  useEffect(() => {
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

  const history = getAnalysisHistory();
  const lastAnalysis = history.length > 0 ? history[0] : null;
  const currentGER = lastAnalysis
    ? (lastAnalysis as ExtendedAnalysisResult).ger ?? Math.round(lastAnalysis.overallScore * 10)
    : 0;
  
  const streak = Math.max(history.length, 1);
  const weekDelta = history.length > 1 ? +(history[0].overallScore - history[1].overallScore).toFixed(1) : 0;

  useEffect(() => {
    const loadUsage = async () => {
      if (!user) return;
      const today = new Date();
      const isoDate = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("usage_limits")
        .select("scans_used, scans_limit, reset_at")
        .eq("user_id", user.id)
        .eq("date", isoDate)
        .maybeSingle();
      if (!error && data) {
        const used = data.scans_used ?? 0;
        const limit = data.scans_limit ?? 3;
        setUsageStatus({ limit, used, remaining: Math.max(0, limit - used), resetAt: data.reset_at ?? undefined });
      } else {
        setUsageStatus({ limit: 3, used: 0, remaining: 3 });
      }
    };
    loadUsage();
  }, [user, showCapture]);

  const startCooldown = (seconds: number) => {
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
    if (isCooldownActive) {
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
  }, []);

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
    if (isCooldownActive) {
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
        
        // Skip heavy processing for small validation, just sample center
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let darkPixels = 0;
        const totalPixels = imageData.data.length / 4;
        
        for (let i = 0; i < imageData.data.length; i += 4 * 10) { // Sample every 10th pixel for speed
            const r = imageData.data[i];
            const g = imageData.data[i+1];
            const b = imageData.data[i+2];
            const brightness = (r + g + b) / 3;
            if (brightness < 30) darkPixels++;
        }
        
        // If > 50% of sampled pixels are very dark, reject
        if (darkPixels / (totalPixels / 10) > 0.5) resolve(false);
        else resolve(true);
      };
      img.src = dataUrl;
    });
  };

  const handleAnalyze = async () => {
    if (isCooldownActive) {
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
    
    // Validate photos presence
    if (!frontPhoto || !sidePhoto) {
        setErrorMsg("Erro: Fotos faltando. Por favor, forneça ambas as fotos.");
        setCaptureStep("intro");
        return;
    }

    try {
        // 1. Timeout safety (15s max)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Tempo limite excedido (15s)")), 15000)
        );

        // 2. Photo validation
        const validationPromise = (async () => {
            const isFrontValid = await validatePhoto(frontPhoto);
            const isSideValid = await validatePhoto(sidePhoto);
            if (!isFrontValid || !isSideValid) {
                throw new Error("As fotos estão muito escuras ou sem qualidade. Tente novamente em um ambiente iluminado.");
            }
            return true;
        })();

        // Race validation against timeout
        await Promise.race([validationPromise, timeoutPromise]);

        // 3. Analysis Simulation (API Call)
        const analysisPromise = (async () => {
            await new Promise((r) => setTimeout(r, 1200));
            const localResult = generateExtendedMockAnalysis();
            try {
              const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-face`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("sb-access-token") || ""}`,
                },
                body: JSON.stringify({ frontalImage: frontPhoto, lateralImage: sidePhoto }),
              });
              const data = await resp.json();
              if (!resp.ok) {
                if (data?.error_code === "QUOTA_EXCEEDED") {
                  setLimitInfo({
                    limit: data.limit ?? 3,
                    remaining: data.remaining ?? 0,
                    resetAt: data.reset_at ?? "",
                  });
                  throw new Error(data.message || "Você atingiu o limite de análises por hoje.");
                }
                if (data?.error_code === "RATE_LIMIT") {
                  const retry = Number(data?.retry_after_seconds) || 15;
                  startCooldown(retry);
                  throw new Error(`Aguarde ${retry}s para nova análise.`);
                }
                throw new Error(data?.message || "Erro na análise. Tente novamente.");
              }
              if (data?.isValidFace === false) {
                throw new Error(data?.reason || "Imagem inválida. Envie uma foto clara do seu rosto.");
              }
              if (typeof data?.cooldown_seconds === "number" && data.cooldown_seconds > 0) {
                startCooldown(Number(data.cooldown_seconds));
              }
              const mapped: ExtendedAnalysisResult = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                overallScore: data.secondaryScore ?? Math.floor(data.ger / 10),
                ger: data.ger,
                categories: [],
                tier: data.tier,
                badge: undefined,
                secondaryScore: data.secondaryScore,
                photoSideUrl: sidePhoto || undefined,
                nextTier: data.nextTier?.name,
                pointsToNextTier: data.nextTier?.pointsNeeded ?? 0,
                technicalBreakdown: {
                  asymmetry: "N/A",
                  thirds: "N/A",
                  jawline: "N/A",
                  cheekbones: "N/A",
                  eyes: "N/A",
                  nose: "N/A",
                  fwhr: "N/A",
                },
              };
              return mapped;
            } catch (err) {
              if (err instanceof Error && /limite|quota|tentativas/i.test(err.message)) {
                throw err;
              }
              return localResult;
            }
        })();

        // Race analysis against timeout
        const result = (await Promise.race([analysisPromise, timeoutPromise])) as ExtendedAnalysisResult;

        // 4. Success Handling
        if (frontPhoto) result.photoUrl = frontPhoto;
        if (sidePhoto) result.photoSideUrl = sidePhoto;
        
        saveAnalysis(result);
        
        // Ensure navigation happens
        navigate(`/results/${result.id}`);

    } catch (error: unknown) {
        console.error("Erro na análise:", error);
        if (error && typeof error === "object" && "message" in error) {
          setErrorMsg(String((error as { message: string }).message));
        } else {
          setErrorMsg("Erro desconhecido ao processar análise.");
        }
        // We stay in "analyzing" state but show error UI, or go back to intro?
        // Let's go back to intro with error message to allow retry
        setCaptureStep("intro");
    } finally {
        if (captureStep === "analyzing") {
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
                  {usageStatus && (
                    <span className="text-[11px] font-bold text-primary">
                      {usageStatus.remaining}/{usageStatus.limit} hoje
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
                                    {/* Grid overlay simulation */}
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
                <InstructionScreen 
                    title="Foto Frontal" 
                    text="Segure o celular na altura dos olhos. Olhe diretamente para a câmera. Mantenha a expressão neutra."
                    icon={Scan}
                    onNext={() => { setErrorMsg(null); setCaptureStep("front-capture"); setMode("idle"); }}
                />
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
                <div className="flex flex-col h-full">
                    <div className="relative aspect-[3/4] w-full max-w-sm mx-auto rounded-3xl border border-border/30 glass overflow-hidden mb-6">
                        <AnimatePresence mode="wait">
                            {mode === "webcam" ? (
                                <motion.div key="webcam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-48 h-64 border-2 border-dashed border-primary/40 rounded-[50%]" />
                                </div>
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                                    <button onClick={capturePhoto} className="h-16 w-16 rounded-full bg-primary glow-primary flex items-center justify-center">
                                    <Camera className="h-7 w-7 text-primary-foreground" />
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
                                className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                                >
                                <div className="w-48 h-64 border-2 border-dashed border-border/50 rounded-[50%] flex items-center justify-center">
                                    <Camera className="h-10 w-10 text-muted-foreground/30" />
                                </div>
                                <p className="text-xs text-muted-foreground">Arraste ou use as opções abaixo</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                    
                    {!(captureStep === "front-capture" ? frontPhoto : sidePhoto) && mode !== "webcam" && (
                        <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
                            <Button onClick={startWebcam} className="gap-2 rounded-2xl py-6 glow-sm bg-blue-500 hover:bg-blue-600 text-white border-none">
                                <Camera className="h-4 w-4 shrink-0" /> <span className="truncate">Usar câmera</span>
                            </Button>
                            <Button variant="outline" className="gap-2 rounded-2xl py-6 glass border-blue-500/30 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4 shrink-0" /> <span className="truncate">Enviar foto</span>
                            </Button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                        </div>
                    )}

                    {(captureStep === "front-capture" ? frontPhoto : sidePhoto) && (
                        <div className="max-w-sm mx-auto w-full space-y-3">
                            <Button className="w-full rounded-2xl py-6 text-base font-semibold glow-primary" onClick={nextStep}>
                                <Zap className="h-5 w-5 mr-2" /> {captureStep === "side-capture" ? "Finalizar Análise" : "Próxima Foto"}
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
            {limitInfo && (
              <Dialog open={true} onOpenChange={(v) => !v && setLimitInfo(null)}>
                <DialogContent className="rounded-2xl border-border/50 bg-card max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-lg">Limite diário atingido</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 text-sm">
                    <p>Você usou {limitInfo.limit - limitInfo.remaining}/{limitInfo.limit} análises hoje.</p>
                    {limitInfo.resetAt && (
                      <p className="text-muted-foreground">Reseta em: {new Date(limitInfo.resetAt).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="grid gap-2 mt-3">
                    <Button className="rounded-xl" onClick={() => setLimitInfo(null)}>
                      Voltar amanhã (ok)
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

  const displayName =
    (user && (user.user_metadata?.full_name || user.user_metadata?.name || user.email)) || "Usuário MAXIMARE";

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 bg-background">
      <div className="container max-w-lg mx-auto space-y-8">

        {/* Header / Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-50 bg-background-dark/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center border border-white/10 shadow-lg shadow-primary/20">
               <User className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Membro Elite</p>
              <h2 className="text-sm font-bold text-white">{displayName}</h2>
            </div>
          </div>
          <button onClick={() => setShowSettings(true)} className="size-10 rounded-lg flex items-center justify-center bg-graphite border border-slate-custom text-white hover:bg-slate-custom transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 pt-4 pb-24 space-y-8">
          {/* Hero Score Section */}
          <section className="text-center py-8">
            <div className="relative inline-block">
              {/* Decorative Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 scale-150 blur-sm animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border border-primary/10 scale-125"></div>
              <h1 className="text-[84px] font-extrabold tracking-tighter leading-none text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {currentGER ? currentGER.toFixed(1) : "0.0"}
              </h1>
            </div>
            <p className="mt-6 text-[11px] font-bold tracking-[0.2em] text-text-muted uppercase">Índice Facial Geral</p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 fill-current" /> +{weekDelta}% ESTE MÊS
              </span>
            </div>
          </section>

          {/* CTA Button */}
          <section>
            <button
              onClick={() => {
                if (isCooldownActive) {
                  setErrorMsg(`Aguarde ${cooldownRemaining}s para nova análise.`);
                  return;
                }
                setShowCapture(true);
                setCaptureStep("intro-hero");
              }}
              disabled={isCooldownActive}
              className={`w-full ${isCooldownActive ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary hover:bg-primary/90 text-white"} rounded-xl py-4 px-6 flex items-center justify-center gap-3 font-bold tracking-wide transition-all active:scale-[0.98] glow-primary-custom border border-white/10 shadow-xl`}
            >
              <Scan className="h-6 w-6" />
              <span>{isCooldownActive ? `Aguarde ${cooldownRemaining}s` : "NOVA ANÁLISE"}</span>
            </button>
            {isCooldownActive && (
              <p className="mt-2 text-[11px] text-text-muted text-center">Protegendo o sistema contra uso excessivo.</p>
            )}
          </section>



          {/* Recent Analyses List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight uppercase text-text-muted">Histórico Recente</h3>
              <button onClick={() => navigate('/progress')} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">Ver tudo</button>
            </div>
            <div className="space-y-3">
              {history.slice(0, 3).map((analysis, idx) => (
                <div key={analysis.id || idx} className="glass-card rounded-xl p-4 flex items-center justify-between border-l-2 border-l-primary hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/results/${analysis.id}`)}>
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
                      <p className="text-xs text-text-muted font-medium">{analysis.date}</p>
                      <h4 className="text-sm font-bold text-white">Structural Scan #{analysis.id.slice(0, 4)}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">{Math.round(analysis.overallScore * 10) / 10}</p>
                    <span className="text-[10px] text-text-muted font-bold uppercase">{getTier(analysis.overallScore).name}</span>
                  </div>
                </div>
              ))}
              
              {history.length === 0 && (
                <div className="text-center py-8 text-text-muted text-sm">
                    Nenhuma análise recente.
                </div>
              )}
            </div>
          </section>
        </main>
        {/* Quota Modal (Dashboard) */}
        {limitInfo && (
          <Dialog open={true} onOpenChange={(v) => !v && setLimitInfo(null)}>
            <DialogContent className="rounded-2xl border-border/50 bg-card max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">Limite diário atingido</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p>Você usou {limitInfo.limit - limitInfo.remaining}/{limitInfo.limit} análises hoje.</p>
                {limitInfo.resetAt && (
                  <p className="text-muted-foreground">Reseta em: {new Date(limitInfo.resetAt).toLocaleString()}</p>
                )}
              </div>
              <div className="grid gap-2 mt-3">
                <Button className="rounded-xl" onClick={() => setLimitInfo(null)} disabled={isCooldownActive}>
                  {isCooldownActive ? `Aguarde ${cooldownRemaining}s` : "Voltar amanhã (ok)"}
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
      </div>
    </div>
  );
}
