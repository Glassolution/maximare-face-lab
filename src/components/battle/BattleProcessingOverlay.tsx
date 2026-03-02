import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Swords } from "lucide-react";

interface BattleProcessingOverlayProps {
  userAvatar?: string | null;
  opponentAvatar?: string | null;
  userName?: string | null;
  opponentName?: string | null;
  isReady?: boolean;
  onComplete?: () => void;
  startTime?: number; // Server-synced start time
}

const STAGES = [
  { text: "Mapeando estrutura facial...", duration: 2000 },
  { text: "Analisando pontos biométricos...", duration: 2000 },
  { text: "Calculando scores de simetria...", duration: 2000 },
  { text: "Comparando resultados...", duration: 1000 },
  { text: "Determinando o vencedor...", duration: 999999 }, // Até terminar
];

// Função para gerar iniciais do nome
const getInitials = (name?: string | null): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map(word => word.charAt(0).toUpperCase())
    .join("")
    .substring(0, 2);
};

export function BattleProcessingOverlay({ userAvatar, opponentAvatar, userName, opponentName, isReady, onComplete, startTime }: BattleProcessingOverlayProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let currentStage = 0;
    // Use server provided startTime if available, otherwise fallback to local Date.now()
    const processingStart = startTime || Date.now();
    
    // Minimum duration 7s, but we simulate up to 10s normally
    const TOTAL_ESTIMATED_TIME = 10000; 

    const interval = setInterval(() => {
      // If ready, we handle progress differently (fast forward to 100)
      if (isReady) return;

      const elapsed = Date.now() - processingStart;
      
      // Update Progress
      const newProgress = Math.min((elapsed / TOTAL_ESTIMATED_TIME) * 100, 95); // Cap at 95% until ready
      setProgress(Math.max(0, newProgress)); // Ensure not negative if clock skew

      // Update Stage Text
      let accumulatedTime = 0;
      for (let i = 0; i < STAGES.length; i++) {
        accumulatedTime += STAGES[i].duration;
        if (elapsed < accumulatedTime) {
          if (currentStage !== i) {
            currentStage = i;
            setStageIndex(i);
          }
          break;
        } else if (i === STAGES.length - 2) {
           // If we passed all defined times, stay on last one
           setStageIndex(STAGES.length - 1);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isReady, startTime]);

  // Handle completion
  useEffect(() => {
    if (isReady) {
      // Fast forward progress to 100%
      setProgress(100);
      setStageIndex(STAGES.length - 1); // Ensure "Determinando o vencedor" or similar is shown
      
      // Wait a bit at 100% then call onComplete
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1500); // 1.5s delay at 100% for impact
      return () => clearTimeout(timer);
    }
  }, [isReady, onComplete]);

  const isFinalStage = stageIndex === STAGES.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
      
      {/* Background Particles/Glow Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[100px] rounded-full animate-pulse" />
      </div>

      <div className="relative w-full max-w-4xl px-4 flex items-center justify-between gap-4 sm:gap-12 z-10">
        
        {/* User Avatar (Left) */}
        <motion.div 
            animate={{ 
                x: isFinalStage ? 20 : [0, -2, 2, -2, 2, 0],
            }}
            transition={{ 
                x: isFinalStage ? { duration: 1 } : { repeat: Infinity, duration: 0.2, repeatDelay: 3 } // Shake periodically
            }}
            className="flex flex-col items-center gap-4"
        >
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                    <AvatarImage src={userAvatar || undefined} className="object-cover" />
                    <AvatarFallback className="bg-zinc-900 text-blue-400 text-lg font-bold">
                        {getInitials(userName || "Você")}
                    </AvatarFallback>
                </Avatar>
            </div>
            <span className="text-blue-500 font-bold tracking-widest text-sm uppercase">Você</span>
        </motion.div>

        {/* Center Swords */}
        <div className="flex flex-col items-center justify-center shrink-0">
            <motion.div
                animate={{ scale: [0.9, 1.1, 0.9] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="relative"
            >
                {/* Particles emitting from center */}
                <div className="absolute inset-0 bg-blue-500/40 blur-xl rounded-full animate-ping" />
                
                <div className="relative bg-black border border-blue-500/50 p-4 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.5)] z-20">
                    <Swords className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500 fill-blue-500/20" />
                </div>
            </motion.div>
        </div>

        {/* Opponent Avatar (Right) */}
        <motion.div 
            animate={{ 
                x: isFinalStage ? -20 : [0, 2, -2, 2, -2, 0],
            }}
            transition={{ 
                x: isFinalStage ? { duration: 1 } : { repeat: Infinity, duration: 0.2, repeatDelay: 3, delay: 0.1 } // Shake periodically
            }}
            className="flex flex-col items-center gap-4"
        >
            <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                    <AvatarImage src={opponentAvatar || undefined} className="object-cover" />
                    <AvatarFallback className="bg-zinc-900 text-red-400 text-lg font-bold">
                        {getInitials(opponentName || "Oponente")}
                    </AvatarFallback>
                </Avatar>
            </div>
            <span className="text-red-500 font-bold tracking-widest text-sm uppercase">Oponente</span>
        </motion.div>

      </div>

      {/* Progress Section */}
      <div className="absolute bottom-20 inset-x-0 px-8 flex flex-col items-center z-10">
        <motion.p 
            key={stageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-white font-bold text-lg sm:text-xl mb-6 text-center h-8"
        >
            {STAGES[stageIndex].text}
        </motion.p>
        
        <div className="w-full max-w-md relative">
            <Progress value={progress} className="h-2 bg-zinc-900" />
            <p className="text-right text-xs text-zinc-500 mt-2 font-mono">{Math.floor(progress)}%</p>
        </div>
      </div>

    </div>
  );
}
