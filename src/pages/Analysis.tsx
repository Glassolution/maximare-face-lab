import { useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, X, Scan, Diamond, Sparkles, Droplets, Scissors, Eye, TrendingUp, ArrowRight, Play, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMockAnalysis, saveAnalysis, getAnalysisHistory } from "@/lib/mockData";
import { Progress } from "@/components/ui/progress";

const categories = [
  { id: "simetria", name: "Simetria", icon: Scan },
  { id: "estrutura", name: "Estrutura", icon: Diamond },
  { id: "harmonia", name: "Harmonia", icon: Sparkles },
  { id: "pele", name: "Pele", icon: Droplets },
  { id: "cabelo", name: "Cabelo", icon: Scissors },
  { id: "olhos", name: "Olhos", icon: Eye },
];

export default function Analysis() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCapture, setShowCapture] = useState(false);
  const [mode, setMode] = useState<"idle" | "webcam" | "uploaded">("idle");
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const history = getAnalysisHistory();
  const lastAnalysis = history.length > 0 ? history[0] : null;
  const totalAnalyses = history.length;
  const avgScore = lastAnalysis ? lastAnalysis.overallScore : 0;
  const progressPercent = Math.round(avgScore * 10);

  const startWebcam = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      setStream(s);
      setMode("webcam");
      setShowCapture(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      alert("Não foi possível acessar a câmera.");
    }
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    setPhoto(canvas.toDataURL("image/jpeg"));
    stopWebcam();
    setMode("uploaded");
  };

  const stopWebcam = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto(e.target?.result as string);
      setMode("uploaded");
      setShowCapture(true);
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhoto(null);
    setMode("idle");
    setShowCapture(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 2500));
    const result = generateMockAnalysis();
    if (photo) result.photoUrl = photo;
    saveAnalysis(result);
    navigate(`/results/${result.id}`);
  };

  // Capture modal/overlay
  if (showCapture) {
    return (
      <div className="min-h-screen pt-6 pb-24 px-4">
        <div className="container max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <h1 className="font-heading text-2xl font-extrabold text-foreground mb-1">Análise Facial</h1>
            <p className="text-sm text-muted-foreground">Tire uma foto ou faça upload para iniciar.</p>
          </motion.div>

          <div className="relative aspect-[3/4] w-full max-w-sm mx-auto rounded-2xl border border-border/50 bg-card overflow-hidden mb-6">
            <AnimatePresence mode="wait">
              {analyzing ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">Analisando seu rosto com IA...</p>
                </motion.div>
              ) : mode === "webcam" ? (
                <motion.div key="webcam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-64 border-2 border-dashed border-primary/50 rounded-[50%]" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <Button onClick={capturePhoto} className="rounded-full h-14 w-14 p-0">
                      <Camera className="h-6 w-6" />
                    </Button>
                  </div>
                </motion.div>
              ) : photo ? (
                <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <img src={photo} alt="Foto capturada" className="h-full w-full object-cover" />
                  <button onClick={clearPhoto} className="absolute top-3 right-3 bg-background/80 backdrop-blur rounded-full p-1.5">
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                >
                  <div className="w-48 h-64 border-2 border-dashed border-border rounded-[50%] flex items-center justify-center">
                    <Camera className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Arraste uma foto ou use as opções abaixo</p>
                </motion.div>
              )}
            </AnimatePresence>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {!analyzing && (
            <p className="text-center text-xs text-muted-foreground mb-6">
              💡 Olhe direto para a câmera, boa iluminação, rosto limpo
            </p>
          )}

          {!analyzing && !photo && mode !== "webcam" && (
            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Button variant="outline" className="gap-2 rounded-xl" onClick={startWebcam}>
                <Camera className="h-4 w-4" /> Usar webcam
              </Button>
              <Button variant="outline" className="gap-2 rounded-xl" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload de foto
              </Button>
              <Button variant="ghost" className="text-muted-foreground text-sm" onClick={() => setShowCapture(false)}>
                Voltar ao dashboard
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {photo && !analyzing && (
            <div className="max-w-sm mx-auto space-y-3">
              <Button className="w-full rounded-xl py-6 text-base font-semibold" onClick={handleAnalyze}>
                Analisar rosto
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={() => setShowCapture(false)}>
                Voltar ao dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard HUD
  return (
    <div className="min-h-screen pt-6 pb-24 px-4">
      <div className="container max-w-lg mx-auto">

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">👋 Bem-vindo de volta</p>
            <h1 className="font-heading text-xl font-extrabold text-foreground">MAXIMARE</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/progress">
              <button className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <TrendingUp className="h-4 w-4" />
              </button>
            </Link>
            <button className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Crown className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative rounded-3xl bg-primary p-5 mb-6 overflow-hidden"
        >
          {/* Subtle glow effect */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-foreground/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary-foreground/5 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                  <Scan className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-primary-foreground">Análise Facial</h2>
                  <p className="text-xs text-primary-foreground/70">
                    {totalAnalyses > 0 ? `${totalAnalyses} análise${totalAnalyses > 1 ? "s" : ""} realizada${totalAnalyses > 1 ? "s" : ""}` : "Comece sua jornada"}
                  </p>
                </div>
              </div>
              {lastAnalysis && (
                <div className="h-12 w-12 rounded-full border-[3px] border-primary-foreground/30 flex items-center justify-center">
                  <span className="text-sm font-extrabold text-primary-foreground">{progressPercent}%</span>
                </div>
              )}
            </div>

            {lastAnalysis && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-primary-foreground/70 mb-1.5">
                  <span>Score atual</span>
                  <span className="font-bold text-primary-foreground">{avgScore}/10</span>
                </div>
                <div className="h-2 w-full bg-primary-foreground/15 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-primary-foreground rounded-full"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowCapture(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/30 transition-colors"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {lastAnalysis ? "Nova Análise" : "Iniciar Análise"}
            </button>
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-bold text-foreground">Categorias</h3>
            <Link to="/recommendations" className="text-xs text-primary font-medium hover:underline">Ver Tudo</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              const catScore = lastAnalysis?.categories.find(c => c.id === cat.id);
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.03 }}
                  className="flex flex-col items-center gap-1.5 min-w-[64px]"
                >
                  <div className="h-14 w-14 rounded-2xl bg-card border border-border/50 flex items-center justify-center hover:border-primary/40 transition-colors cursor-default">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">{cat.name}</span>
                  {catScore && (
                    <span className="text-[10px] font-bold text-primary">{catScore.score}</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent analyses */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-bold text-foreground">Análises Recentes</h3>
            {history.length > 0 && (
              <Link to="/progress" className="text-xs text-primary font-medium hover:underline">Ver Tudo</Link>
            )}
          </div>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Scan className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Nenhuma análise ainda</p>
              <p className="text-xs text-muted-foreground/70 mb-4">Faça sua primeira análise facial</p>
              <Button className="rounded-xl gap-2" onClick={() => setShowCapture(true)}>
                <Camera className="h-4 w-4" /> Começar agora
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {history.slice(0, 4).map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.18 + i * 0.04 }}
                >
                  <Link
                    to={`/results/${a.id}`}
                    className="block rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 transition-colors group"
                  >
                    {a.photoUrl ? (
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <img src={a.photoUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                        <div className="absolute bottom-2 left-2">
                          <span className="text-[10px] font-semibold bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-lg backdrop-blur-sm">
                            Score {a.overallScore}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-muted flex items-center justify-center relative">
                        <Scan className="h-8 w-8 text-muted-foreground/30" />
                        <div className="absolute bottom-2 left-2">
                          <span className="text-[10px] font-semibold bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-lg">
                            Score {a.overallScore}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-medium text-foreground truncate">
                        Análise #{totalAnalyses - i}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(a.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-bold text-foreground">Ações Rápidas</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowCapture(true)}
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 hover:border-primary/30 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nova Análise</p>
                <p className="text-[10px] text-muted-foreground">Escaneie seu rosto</p>
              </div>
            </button>
            <Link
              to="/recommendations"
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 hover:border-primary/30 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Dicas</p>
                <p className="text-[10px] text-muted-foreground">Recomendações</p>
              </div>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
