import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, Loader2, X, Zap, Flame, Target, ArrowUp,
  ChevronRight, Crown, Droplets, Scissors, Sparkles, PersonStanding, Scan, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalysisHistory, generateMockAnalysis, saveAnalysis } from "@/lib/mockData";
import { GerResult, saveGerResult, TIER_LABELS } from "@/lib/gerTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const subscores = [
  { id: "simetria", label: "Simetria", icon: Scan },
  { id: "estrutura", label: "Mandíbula", icon: Target },
  { id: "pele", label: "Pele", icon: Droplets },
  { id: "cabelo", label: "Cabelo", icon: Scissors },
  { id: "estilo", label: "Estilo", icon: Sparkles },
  { id: "postura", label: "Postura", icon: PersonStanding },
];

const weeklyGoals = [
  { label: "Jaw training", done: true },
  { label: "Skincare AM/PM", done: true },
  { label: "Postura 10min", done: false },
  { label: "Ice face", done: false },
];

function resizeImage(dataUrl: string, maxWidth = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
}

export default function Analysis() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCapture, setShowCapture] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<"frontal" | "lateral">("frontal");
  const [mode, setMode] = useState<"idle" | "webcam" | "uploaded">("idle");
  const [frontalPhoto, setFrontalPhoto] = useState<string | null>(null);
  const [lateralPhoto, setLateralPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const history = getAnalysisHistory();
  const lastAnalysis = history.length > 0 ? history[0] : null;
  const avgScore = lastAnalysis ? lastAnalysis.overallScore : 0;
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
    } catch { toast.error("Não foi possível acessar a câmera."); }
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    const dataUrl = await resizeImage(canvas.toDataURL("image/jpeg"));
    if (captureTarget === "frontal") setFrontalPhoto(dataUrl);
    else setLateralPhoto(dataUrl);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setMode("uploaded");
  };

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = await resizeImage(e.target?.result as string);
      if (captureTarget === "frontal") setFrontalPhoto(dataUrl);
      else setLateralPhoto(dataUrl);
      setMode("uploaded");
    };
    reader.readAsDataURL(file);
  };

  const clearCurrentPhoto = () => {
    if (captureTarget === "frontal") setFrontalPhoto(null);
    else setLateralPhoto(null);
    setMode("idle");
  };

  const openCapture = (target: "frontal" | "lateral") => {
    setCaptureTarget(target);
    setMode("idle");
    setShowCapture(true);
  };

  const confirmPhoto = () => {
    setShowCapture(false);
    setMode("idle");
  };

  const currentPhoto = captureTarget === "frontal" ? frontalPhoto : lateralPhoto;

  const handleAnalyze = async () => {
    if (!frontalPhoto) {
      toast.error("Envie pelo menos a foto frontal.");
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress(0);
    setShowCapture(false);

    // Progress animation
    const interval = setInterval(() => {
      setAnalysisProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-face", {
        body: { frontalImage: frontalPhoto, lateralImage: lateralPhoto },
      });

      clearInterval(interval);
      setAnalysisProgress(100);

      if (error) {
        toast.error("Erro na análise. Tente novamente.");
        setAnalyzing(false);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        setAnalyzing(false);
        return;
      }

      if (!data.isValidFace) {
        toast.error(data.reason || "Imagem inválida. Envie uma foto clara do seu rosto.");
        setAnalyzing(false);
        return;
      }

      // Save result
      const result: GerResult = {
        ...data,
        frontalPhoto,
        lateralPhoto,
      };
      const saved = saveGerResult(result);

      // Also save to old format for dashboard compatibility
      const mockResult = generateMockAnalysis();
      mockResult.overallScore = data.secondaryScore;
      mockResult.photoUrl = frontalPhoto;
      saveAnalysis(mockResult);

      await new Promise((r) => setTimeout(r, 500));
      navigate(`/ger-results/${saved.id}`);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      toast.error("Erro de conexão. Tente novamente.");
      setAnalyzing(false);
    }
  };

  // Score ring SVG
  const ScoreRing = ({ score }: { score: number }) => {
    const pct = score * 10;
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
          <span className="text-[10px] text-muted-foreground font-medium">/ 10</span>
        </div>
      </div>
    );
  };

  // ── ANALYZING OVERLAY ──
  if (analyzing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
          <div className="h-20 w-20 mx-auto rounded-full glow-primary flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-1">Analisando com IA</h2>
            <p className="text-sm text-muted-foreground">Calculando seu GER...</p>
          </div>
          <div className="w-64 mx-auto">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{Math.round(analysisProgress)}%</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── CAPTURE OVERLAY ──
  if (showCapture) {
    return (
      <div className="min-h-screen pt-6 pb-24 px-4">
        <div className="container max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
              Foto {captureTarget === "frontal" ? "Frontal" : "Lateral"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {captureTarget === "frontal" ? "Olhe direto para a câmera, rosto reto." : "Mostre o perfil esquerdo ou direito."}
            </p>
          </motion.div>

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
              ) : currentPhoto ? (
                <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <img src={currentPhoto} alt="" className="h-full w-full object-cover" />
                  <button onClick={clearCurrentPhoto} className="absolute top-3 right-3 glass rounded-full p-2">
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

          {!currentPhoto && mode !== "webcam" && (
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Button onClick={startWebcam} className="gap-2 rounded-2xl py-6 glow-sm">
                <Camera className="h-4 w-4" /> Usar câmera
              </Button>
              <Button variant="outline" className="gap-2 rounded-2xl py-6 glass border-border/30" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload de foto
              </Button>
              <Button variant="ghost" className="text-muted-foreground text-sm" onClick={() => setShowCapture(false)}>Voltar</Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {currentPhoto && (
            <div className="max-w-sm mx-auto space-y-3">
              <Button className="w-full rounded-2xl py-6 text-base font-semibold" onClick={confirmPhoto}>
                ✓ Confirmar foto {captureTarget === "frontal" ? "frontal" : "lateral"}
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={clearCurrentPhoto}>Tirar outra</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ──
  return (
    <div className="min-h-screen pt-6 pb-28 px-4">
      <div className="container max-w-lg mx-auto space-y-6">
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
          className="relative rounded-3xl glass-strong p-6 overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent/6 blur-3xl" />
          <div className="relative z-10 flex items-center gap-6">
            <ScoreRing score={avgScore || 7.2} />
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Visual Score</h2>
                <p className="text-xs text-muted-foreground">
                  {lastAnalysis ? "Baseado na última análise" : "Faça sua primeira análise"}
                </p>
              </div>
              {weekDelta !== 0 && (
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${weekDelta > 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  <ArrowUp className={`h-3 w-3 ${weekDelta < 0 ? "rotate-180" : ""}`} />
                  {weekDelta > 0 ? "+" : ""}{weekDelta} esta semana
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Photo Upload Section */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="font-heading text-sm font-bold text-foreground mb-3">Nova Análise GER</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Frontal */}
            <button
              onClick={() => openCapture("frontal")}
              className="relative rounded-2xl glass p-4 flex flex-col items-center gap-3 min-h-[140px] transition-all hover:border-primary/50"
            >
              {frontalPhoto ? (
                <>
                  <img src={frontalPhoto} alt="Frontal" className="w-16 h-16 rounded-xl object-cover" />
                  <span className="text-xs font-medium text-success">✓ Frontal</span>
                </>
              ) : (
                <>
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground">Foto Frontal</span>
                  <span className="text-[10px] text-muted-foreground">Obrigatória</span>
                </>
              )}
            </button>

            {/* Lateral */}
            <button
              onClick={() => openCapture("lateral")}
              className="relative rounded-2xl glass p-4 flex flex-col items-center gap-3 min-h-[140px] transition-all hover:border-primary/50"
            >
              {lateralPhoto ? (
                <>
                  <img src={lateralPhoto} alt="Lateral" className="w-16 h-16 rounded-xl object-cover" />
                  <span className="text-xs font-medium text-success">✓ Lateral</span>
                </>
              ) : (
                <>
                  <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Image className="h-6 w-6 text-accent" />
                  </div>
                  <span className="text-xs font-medium text-foreground">Foto Lateral</span>
                  <span className="text-[10px] text-muted-foreground">Opcional</span>
                </>
              )}
            </button>
          </div>

          {/* Analyze CTA */}
          <Button
            className="w-full rounded-2xl py-6 text-base font-semibold glow-primary mt-4"
            disabled={!frontalPhoto}
            onClick={handleAnalyze}
          >
            <Zap className="h-5 w-5 mr-2" />
            {frontalPhoto && lateralPhoto ? "Análise Completa" : frontalPhoto ? "Análise Parcial" : "Envie uma foto para começar"}
          </Button>
          {frontalPhoto && !lateralPhoto && (
            <p className="text-xs text-center text-warning mt-2">⚠️ Sem foto lateral, a análise terá precisão reduzida.</p>
          )}
        </motion.div>

        {/* Subscores */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="font-heading text-sm font-bold text-foreground mb-3">Seus Subscores</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {subscores.map((sub, i) => {
              const catData = lastAnalysis?.categories.find(c => c.id === sub.id);
              const score = catData?.score || (6 + Math.random() * 2.5);
              const pct = (score / 10) * 100;
              const Icon = sub.icon;
              return (
                <motion.div key={sub.id}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12 + i * 0.03 }}
                  className="rounded-2xl glass p-3.5 flex items-center gap-3"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{sub.label}</span>
                      <span className="text-xs font-bold text-primary">{+score.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Weekly Goals */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-bold text-foreground">Metas da Semana</h3>
            <span className="text-xs text-muted-foreground">{weeklyGoals.filter(g => g.done).length}/{weeklyGoals.length}</span>
          </div>
          <div className="space-y-2">
            {weeklyGoals.map((goal, i) => (
              <motion.div key={goal.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.04 }}
                className={`flex items-center gap-3 rounded-2xl glass p-3.5 ${goal.done ? "opacity-60" : ""}`}
              >
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${goal.done ? "border-success bg-success/20" : "border-border"}`}>
                  {goal.done && <div className="h-2.5 w-2.5 rounded-full bg-success" />}
                </div>
                <span className={`text-sm font-medium flex-1 ${goal.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {goal.label}
                </span>
                {!goal.done && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Rank Banner */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-3xl overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20" />
          <div className="relative glass-strong rounded-3xl p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Seu nível atual</p>
              <p className="font-heading text-lg font-bold text-gradient">
                {avgScore >= 8 ? "APEX" : avgScore >= 6.5 ? "ELITE" : avgScore >= 5 ? "AVANÇADO" : "INICIANTE"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Próximo nível</p>
              <p className="text-sm font-bold text-foreground">
                {avgScore >= 8 ? "MAX" : avgScore >= 6.5 ? "8.0" : avgScore >= 5 ? "6.5" : "5.0"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
