import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

const LOADING_TEXTS = [
  "Calculando simetria facial...",
  "Analisando estrutura óssea...",
  "Comparando proporção áurea...",
  "Avaliando textura da pele...",
  "Gerando veredito final..."
];

export function BattleProcessingOverlay() {
  const [textIndex, setTextIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const textInterval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 95));
    }, 50);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-6"
    >
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
        <div className="relative z-10 bg-black/50 p-6 rounded-full border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
        </div>
      </div>

      <motion.h2
        key={textIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-2xl font-bold text-center mb-2 min-h-[32px]"
      >
        {LOADING_TEXTS[textIndex]}
      </motion.h2>

      <p className="text-muted-foreground text-sm mb-8">A IA está decidindo o vencedor.</p>

      <div className="w-full max-w-xs">
        <Progress value={progress} className="h-2" />
      </div>
    </motion.div>
  );
}
