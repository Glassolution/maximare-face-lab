import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMockAnalysis, saveAnalysis } from "@/lib/mockData";

export default function Analysis() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"idle" | "webcam" | "uploaded">("idle");
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startWebcam = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      setStream(s);
      setMode("webcam");
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
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhoto(null);
    setMode("idle");
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 2500));
    const result = generateMockAnalysis();
    if (photo) result.photoUrl = photo;
    saveAnalysis(result);
    navigate(`/results/${result.id}`);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Análise Facial</h1>
          <p className="text-sm text-muted-foreground">Tire uma foto ou faça upload para iniciar a análise.</p>
        </motion.div>

        {/* Preview area */}
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
                {/* Oval guide */}
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

        {/* Instructions */}
        {!analyzing && (
          <p className="text-center text-xs text-muted-foreground mb-6">
            💡 Olhe direto para a câmera, boa iluminação, rosto limpo
          </p>
        )}

        {/* Actions */}
        {!analyzing && !photo && mode !== "webcam" && (
          <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
            <Button variant="outline" className="flex-1 gap-2 rounded-xl" onClick={startWebcam}>
              <Camera className="h-4 w-4" /> Usar webcam
            </Button>
            <Button variant="outline" className="flex-1 gap-2 rounded-xl" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload de foto
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}

        {photo && !analyzing && (
          <div className="max-w-sm mx-auto">
            <Button className="w-full rounded-xl py-6 text-base font-semibold" onClick={handleAnalyze}>
              Analisar rosto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
