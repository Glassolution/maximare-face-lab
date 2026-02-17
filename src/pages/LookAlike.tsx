import { useState, useRef, useCallback, useEffect, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, Loader2, X, Scan, ChevronRight, ArrowUp, Crown, Info, CheckCircle2,
  Image as ImageIcon, Zap, PersonStanding, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { findLookAlike, LookAlikeResult } from "@/lib/lookAlikeSystem";
import { Celebrity } from "@/lib/celebrityDatabase";
import { Link } from "react-router-dom";

type InstructionScreenProps = {
  title: string;
  text: string;
  icon: ComponentType<{ className?: string }>;
  onNext: () => void;
  image?: string;
};

const InstructionScreen = ({ title, text, icon: Icon, onNext }: InstructionScreenProps) => (
  <div className="flex flex-col items-center text-center justify-between h-full py-8">
    <div className="flex flex-col items-center gap-6">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground max-w-xs">{text}</p>
      <div className="flex flex-col gap-2 text-sm text-left bg-secondary/30 p-4 rounded-xl mt-4">
        <div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-green-500" /> Boa iluminação</div>
        <div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-green-500" /> Rosto limpo</div>
        <div className="flex items-center gap-2"><ArrowUp className="h-4 w-4 text-green-500" /> Sem óculos/boné</div>
      </div>
    </div>
    <Button onClick={onNext} className="w-full max-w-xs rounded-2xl py-6 text-base glow-primary">
      Entendi, vamos lá
    </Button>
  </div>
);

export default function LookAlike() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"intro" | "front-instruction" | "front-capture" | "side-instruction" | "side-capture" | "analyzing" | "result">("intro");
  const [mode, setMode] = useState<"idle" | "webcam" | "uploaded">("idle");
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [result, setResult] = useState<LookAlikeResult | null>(null);
  const [analysisStage, setAnalysisStage] = useState(0); // 0-4 for checklist
  const [consent, setConsent] = useState(false);

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
    
    if (step === "front-capture") {
      setFrontPhoto(dataUrl);
      stopWebcam();
      setMode("uploaded");
    } else if (step === "side-capture") {
      setSidePhoto(dataUrl);
      stopWebcam();
      setMode("uploaded");
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (step === "front-capture") {
        setFrontPhoto(dataUrl);
        setMode("uploaded");
      } else if (step === "side-capture") {
        setSidePhoto(dataUrl);
        setMode("uploaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    if (step === "front-capture") setFrontPhoto(null);
    if (step === "side-capture") setSidePhoto(null);
    setMode("idle");
    stopWebcam();
  };

  const handleAnalyze = async () => {
    setStep("analyzing");
    
    // Animate checklist
    const stages = [
      "Detectando rosto...",
      "Checando qualidade...",
      "Normalizando imagem...",
      "Gerando Face Embedding...",
      "Buscando similaridades..."
    ];

    for (let i = 0; i < stages.length; i++) {
      setAnalysisStage(i);
      await new Promise(r => setTimeout(r, 800));
    }

    const res = await findLookAlike(frontPhoto!, sidePhoto);
    setResult(res);
    setStep("result");
  };

  // ── INTRO SCREEN ──
  if (step === "intro") {
    return (
      <div className="min-h-screen pt-20 px-4 flex flex-col items-center text-center max-w-md mx-auto">
        <div className="mb-8 relative">
           <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
           <Search className="h-20 w-20 text-primary relative z-10" />
        </div>
        <h1 className="font-heading text-3xl font-bold mb-4">Qual seu Look-Alike?</h1>
        <p className="text-muted-foreground mb-8">
          Descubra com qual ator ou modelo você mais se parece. Nossa IA analisa seus traços faciais e encontra seu "gêmeo" na nossa base de celebridades.
        </p>

        <div className="bg-secondary/30 p-4 rounded-xl w-full mb-8 text-left space-y-3">
           <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm">Match por IA com base em estrutura óssea e proporções.</p>
           </div>
           <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm">Top 5 matches + porcentagem de similaridade.</p>
           </div>
           <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm">Explicação detalhada dos traços em comum.</p>
           </div>
        </div>

        <div className="flex items-center gap-3 w-full mb-6 px-2">
            <input 
                type="checkbox" 
                id="consent" 
                checked={consent} 
                onChange={(e) => setConsent(e.target.checked)}
                className="w-5 h-5 rounded border-input bg-background text-primary focus:ring-primary"
            />
            <label htmlFor="consent" className="text-xs text-left text-muted-foreground">
                Autorizo a análise do meu rosto para gerar o look-alike. A foto não será salva.
            </label>
        </div>

        <Button 
            disabled={!consent}
            onClick={() => setStep("front-instruction")} 
            className="w-full rounded-2xl py-6 text-base font-bold shadow-lg glow-primary"
        >
            Começar Análise
        </Button>
      </div>
    );
  }

  // ── CAPTURE FLOW (Reusing logic) ──
  if (["front-instruction", "front-capture", "side-instruction", "side-capture"].includes(step)) {
    return (
      <div className="min-h-screen pt-6 pb-10 px-4 bg-background flex flex-col">
        <div className="container max-w-lg mx-auto flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" size="sm" onClick={() => setStep("intro")}>
                    <X className="h-5 w-5" />
                </Button>
                <span className="text-sm font-bold text-muted-foreground">
                     {step.includes("front") ? "1/2: Frente" : "2/2: Lateral (Opcional)"}
                </span>
                <div className="w-8" />
            </div>

            {step === "front-instruction" && (
                <InstructionScreen 
                    title="Foto Frontal" 
                    text="Segure o celular na altura dos olhos. Olhe diretamente para a câmera."
                    icon={Scan}
                    onNext={() => setStep("front-capture")}
                />
            )}

            {step === "side-instruction" && (
                <div className="flex flex-col items-center justify-between h-full py-8">
                     <InstructionScreen 
                        title="Foto Lateral" 
                        text="Vire o rosto levemente. Ajuda a identificar o formato do maxilar."
                        icon={PersonStanding}
                        onNext={() => setStep("side-capture")}
                    />
                    <Button variant="ghost" onClick={handleAnalyze} className="text-muted-foreground underline mt-4">
                        Pular (Usar apenas frontal)
                    </Button>
                </div>
            )}

            {(step === "front-capture" || step === "side-capture") && (
                <div className="flex flex-col h-full">
                    <div className="relative aspect-[3/4] w-full max-w-sm mx-auto rounded-3xl border border-border/30 glass overflow-hidden mb-6">
                        <AnimatePresence mode="wait">
                            {mode === "webcam" ? (
                                <motion.div key="webcam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                                    <button onClick={capturePhoto} className="h-16 w-16 rounded-full bg-primary glow-primary flex items-center justify-center">
                                    <Camera className="h-7 w-7 text-primary-foreground" />
                                    </button>
                                </div>
                                </motion.div>
                            ) : (step === "front-capture" ? frontPhoto : sidePhoto) ? (
                                <motion.div key="photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                <img src={step === "front-capture" ? frontPhoto! : sidePhoto!} alt="" className="h-full w-full object-cover" />
                                <button onClick={clearPhoto} className="absolute top-3 right-3 glass rounded-full p-2">
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
                    
                    {!(step === "front-capture" ? frontPhoto : sidePhoto) && mode !== "webcam" && (
                        <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
                            <Button onClick={startWebcam} className="gap-2 rounded-2xl py-6 glow-sm">
                                <Camera className="h-4 w-4" /> Usar câmera
                            </Button>
                            <Button variant="outline" className="gap-2 rounded-2xl py-6 glass border-border/30" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="h-4 w-4" /> Upload de foto
                            </Button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                        </div>
                    )}

                    {(step === "front-capture" ? frontPhoto : sidePhoto) && (
                        <div className="max-w-sm mx-auto w-full space-y-3">
                            <Button className="w-full rounded-2xl py-6 text-base font-semibold glow-primary" 
                                onClick={() => {
                                    if (step === "front-capture") setStep("side-instruction");
                                    else handleAnalyze();
                                }}
                            >
                                <Zap className="h-5 w-5 mr-2" /> {step === "side-capture" ? "Ver Resultado" : "Próxima Foto"}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    );
  }

  // ── ANALYZING SCREEN ──
  if (step === "analyzing") {
    const checklist = [
      "Detectando rosto",
      "Checando qualidade",
      "Normalizando imagem",
      "Gerando Face Embedding",
      "Buscando similaridades"
    ];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-background">
         <div className="w-full max-w-sm space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Analisando...</h2>
            
            <div className="space-y-4">
                {checklist.map((item, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0.5, x: -10 }}
                        animate={{ 
                            opacity: index <= analysisStage ? 1 : 0.5,
                            x: index <= analysisStage ? 0 : -10,
                            color: index < analysisStage ? "hsl(var(--primary))" : index === analysisStage ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"
                        }}
                        className="flex items-center gap-3"
                    >
                        {index < analysisStage ? (
                            <CheckCircle2 className="h-5 w-5" />
                        ) : index === analysisStage ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted" />
                        )}
                        <span className="font-medium">{item}</span>
                    </motion.div>
                ))}
            </div>
         </div>
      </div>
    );
  }

  // ── RESULT SCREEN ──
  if (step === "result" && result) {
    return (
      <div className="min-h-screen pt-10 pb-24 px-4 bg-background">
        <div className="container max-w-md mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStep("intro")}><X /></Button>
                <h1 className="font-bold text-lg">Seu Look-Alike</h1>
                <div className="w-10" />
            </div>

            {/* TOP MATCH CARD */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-[2rem] overflow-hidden bg-card border border-border/50 shadow-2xl"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
                
                <div className="relative p-6 flex flex-col items-center text-center">
                    <p className="text-sm font-bold text-primary mb-2 tracking-wider uppercase">Match Principal</p>
                    <h2 className="font-heading text-3xl font-bold mb-4">{result.topMatch.name}</h2>
                    
                    <div className="relative w-48 h-48 mb-6">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-accent animate-pulse opacity-50 blur-xl" />
                        <img src={result.topMatch.photoUrl} alt={result.topMatch.name} className="relative w-full h-full object-cover rounded-full border-4 border-background shadow-xl" />
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-1.5 rounded-full font-bold shadow-lg text-sm">
                            {result.similarity}% Similar
                        </div>
                    </div>

                    <div className="bg-secondary/50 rounded-xl p-4 w-full text-left space-y-2">
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Por que deu match?</p>
                        {result.top5[0].reasons.map((reason, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                <span>{reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* TOP 5 LIST */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg px-2">Outros Matches</h3>
                {result.top5.slice(1).map((match, i) => (
                    <motion.div 
                        key={match.celebrity.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-4 bg-card border border-border/50 p-3 rounded-2xl"
                    >
                        <img src={match.celebrity.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                        <div className="flex-1">
                            <p className="font-bold text-sm">{match.celebrity.name}</p>
                            <div className="w-full h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${match.similarity}%` }} />
                            </div>
                        </div>
                        <span className="font-bold text-sm text-muted-foreground">{match.similarity}%</span>
                    </motion.div>
                ))}
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-6 text-center space-y-4 border border-primary/20">
                <Crown className="h-8 w-8 text-primary mx-auto" />
                <div>
                    <h3 className="font-bold text-lg">Quer aumentar seu score?</h3>
                    <p className="text-sm text-muted-foreground">Veja o plano de looksmaxing para melhorar sua similaridade com os Top Tiers.</p>
                </div>
                <Link to="/analysis">
                    <Button className="w-full rounded-xl font-bold shadow-lg">
                        Ver Plano Looksmaxing
                    </Button>
                </Link>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
                *Resultados estimados baseados em IA. A similaridade pode variar conforme a iluminação e ângulo.
            </p>
        </div>
      </div>
    );
  }

  return null;
}
