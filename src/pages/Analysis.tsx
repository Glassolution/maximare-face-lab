import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, Loader2, X, Scan, Flame, Target, Zap, Settings,
  ChevronRight, ArrowUp, Crown, Droplets, Scissors, Dumbbell, Sparkles, PersonStanding, Info,
  Image as ImageIcon, Shirt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAnalysis, getAnalysisHistory } from "@/lib/mockData";
import { generateExtendedMockAnalysis, getTier, getNextTier } from "@/lib/rankingSystem";
import motivationModel from "@/assets/motivation-model.png";
import faceScanHero from "@/assets/clark.png";

const subscores = [
  { id: "jawline", label: "Mandíbula", icon: Target },
  { id: "symmetry", label: "Simetria", icon: Scan },
  { id: "skin", label: "Pele", icon: Droplets },
  { id: "cheekbones", label: "Maçãs", icon: Diamond },
];

// Placeholder for iconMap to avoid errors if Diamond isn't imported
import { Diamond } from "lucide-react";

const weeklyGoals = [
  { label: "Jaw training", done: true },
  { label: "Skincare AM/PM", done: true },
  { label: "Postura 10min", done: false },
  { label: "Ice face", done: false },
];

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

  useEffect(() => {
    if (searchParams.get("start") === "true") {
      setShowCapture(true);
      setCaptureStep("intro-hero");
    }
  }, [searchParams]);

  const history = getAnalysisHistory();
  const lastAnalysis = history.length > 0 ? history[0] : null;
  // Convert old score to GER if needed or use new GER
  const currentGER = lastAnalysis ? (lastAnalysis as any).ger || Math.round(lastAnalysis.overallScore * 10) : 0;
  const currentTier = getTier(currentGER);
  
  const nextTier = getNextTier(currentGER);
  const pointsToNext = nextTier ? nextTier.min - currentGER : 0;
  const progressToNext = nextTier 
    ? Math.min(100, Math.max(0, ((currentGER - currentTier.min) / (nextTier.min - currentTier.min)) * 100))
    : 100;

  const lowestCategory = lastAnalysis && 'categories' in lastAnalysis 
    ? (lastAnalysis as any).categories.reduce((min: any, curr: any) => curr.score < min.score ? curr : min, (lastAnalysis as any).categories[0])
    : null;
    
  const insightTip = lowestCategory 
    ? `Focar em ${lowestCategory.name} trará o maior retorno para sua pontuação.`
    : "Complete sua análise para desbloquear insights estratégicos.";

  const streak = Math.max(history.length, 1);
  const weekDelta = history.length > 1 ? +(history[0].overallScore - history[1].overallScore).toFixed(1) : 0;

  const startWebcam = useCallback(async () => {
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
            // Simulate network delay
            await new Promise((r) => setTimeout(r, 3000));
            
            // Call "API" (Mock function)
            const result = generateExtendedMockAnalysis();
            
            // Verify result integrity
            if (!result || !result.id || typeof result.ger !== 'number') {
                throw new Error("Resposta inválida da IA.");
            }
            
            return result;
        })();

        // Race analysis against timeout
        const result = await Promise.race([analysisPromise, timeoutPromise]) as any;

        // 4. Success Handling
        if (frontPhoto) result.photoUrl = frontPhoto;
        if (sidePhoto) result.photoSideUrl = sidePhoto;
        
        saveAnalysis(result);
        
        // Ensure navigation happens
        navigate(`/results/${result.id}`);

    } catch (error: any) {
        console.error("Erro na análise:", error);
        setErrorMsg(error.message || "Erro desconhecido ao processar análise.");
        // We stay in "analyzing" state but show error UI, or go back to intro?
        // Let's go back to intro with error message to allow retry
        setCaptureStep("intro");
    }
  };

  // Helper for instructions
  const InstructionScreen = ({ title, text, icon: Icon, onNext, image }: any) => (
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

  // Score ring SVG
  const ScoreRing = ({ score }: { score: number }) => {
    const pct = score; // 0-99
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (pct / 100) * circumference;
    return (
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="url(#scoreGradient)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="animate-score-ring"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-3xl font-bold text-foreground">{score}</span>
          <span className="text-[10px] text-muted-foreground font-medium">Aura</span>
        </div>
      </div>
    );
  };

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
                <div className="w-10" /> {/* Spacer matched to button width */}
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
      </div>
    );
  }

  // ───────── DASHBOARD ─────────

  const categories = lastAnalysis && 'categories' in lastAnalysis ? (lastAnalysis as any).categories : [];
  const getScore = (id: string) => {
      const cat = categories.find((c: any) => c.id === id);
      return cat ? (cat.score >= 10 ? (cat.score / 10).toFixed(1) : cat.score) : "-";
  };
  const getProgress = (id: string) => {
      const cat = categories.find((c: any) => c.id === id);
      return cat ? cat.score : 0;
  };

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 bg-background">
      <div className="container max-w-lg mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Sua jornada de evolução</p>
            <h1 className="font-heading text-xl font-bold text-foreground tracking-tight">MAXIMARE</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
              <Flame className="h-4 w-4 text-orange-400 animate-fire" />
              <span className="text-sm font-bold text-foreground">{streak}</span>
            </div>
            <button className="h-9 w-9 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Crown className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Visual Score Card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative rounded-[2rem] bg-card border border-border/50 p-6 overflow-hidden shadow-xl"
        >
          <div className="relative z-10 flex items-center gap-8 justify-center">
             <div className="scale-125">
                <ScoreRing score={currentGER} />
             </div>
             <div className="flex flex-col">
                <h2 className="font-heading text-2xl font-bold text-foreground leading-none">Visual<br/>Score</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-[100px] leading-tight">
                    {lastAnalysis ? `Tier: ${currentTier.name}` : "Faça sua primeira análise"}
                </p>
             </div>
          </div>
        </motion.div>

        {/* Motivation Banner */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="relative rounded-2xl overflow-hidden h-36 group cursor-pointer"
          onClick={() => { setShowCapture(true); setCaptureStep("intro"); setErrorMsg(null); }}
        >
          <img src={motivationModel} alt="Motivação" className="absolute inset-0 w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-4">
            <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">True Adam • GER 95+</p>
            <h3 className="font-heading text-lg font-bold text-foreground leading-tight">Descubra seu<br/>potencial máximo</h3>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              Faça sua análise agora <ChevronRight className="h-3 w-3" />
            </p>
          </div>
        </motion.div>

        {/* AI Insights Section */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-4">
                 <h3 className="font-heading text-lg font-bold text-foreground">Insights da IA</h3>
                 <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">BETA</span>
            </div>
            
            <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-5 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="h-24 w-24 text-primary" />
                </div>

                <div className="relative z-10 flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center shrink-0 border border-primary/10">
                        <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                         <h4 className="font-heading font-bold text-base text-foreground">
                            {nextTier ? `Rumo ao ${nextTier.name.toUpperCase()}` : "Nível Máximo Alcançado"}
                         </h4>
                         <p className="text-xs text-muted-foreground leading-snug">
                            {nextTier 
                                ? <span>Faltam <span className="text-primary font-bold">{pointsToNext} pontos</span> para o próximo nível.</span>
                                : "Você atingiu o pináculo da estética."}
                         </p>
                    </div>
                </div>

                {/* Progress to next level */}
                {nextTier && (
                    <div className="relative z-10 space-y-2">
                        <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span>Progresso atual</span>
                            <span>{Math.round(progressToNext)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressToNext}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                            />
                        </div>
                    </div>
                )}

                <div className="relative z-10 bg-secondary/30 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                    <div className="flex gap-2">
                        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-bold text-foreground block mb-1">Dica Personalizada:</span>
                            {insightTip}
                        </p>
                    </div>
                </div>

                 <Button onClick={() => { setShowCapture(true); setCaptureStep("intro"); setErrorMsg(null); }}
                    variant="ghost"
                    className="relative z-10 w-full h-auto py-3 text-xs font-semibold text-primary hover:text-primary/80 hover:bg-primary/5 p-0 justify-center border border-dashed border-primary/30 rounded-xl hover:border-primary/60 transition-all"
                >
                    <Zap className="h-3 w-3 mr-2" />
                    Nova análise para atualizar dados
                </Button>
            </div>
        </motion.div>

        {/* Subscores Grid */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Seus Subscores</h3>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { id: "symmetry", label: "Simetria", icon: Scan },
                    { id: "jawline", label: "Mandíbula", icon: Target },
                    { id: "skin", label: "Pele", icon: Droplets },
                    { id: "hairline", label: "Cabelo", icon: Scissors },
                    { id: "eyes", label: "Olhos", icon: Sparkles }, // Replaced Estilo with Olhos
                    { id: "posture", label: "Postura", icon: PersonStanding },
                ].map((item) => (
                    <div key={item.id} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <item.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-bold text-foreground truncate">{item.label}</span>
                                <span className="text-sm font-bold text-primary">{getScore(item.id)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${getProgress(item.id)}%` }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>

      </div>
    </div>
  );
}
