import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { BattleResult } from "@/types/battle";
import { useAuth } from "@/hooks/useAuth";

interface LoserRevealOverlayProps {
  result: BattleResult | null;
  onComplete: () => void;
}

export function LoserRevealOverlay({ result, onComplete }: LoserRevealOverlayProps) {
  const { user } = useAuth();
  const [show, setShow] = useState(true);

  // Check if trash talk is enabled via Env Var (default false if not set)
  const enableTrashTalk = import.meta.env.VITE_BATTLE_TRASH_TALK === 'true';

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500); // Allow exit animation
    }, 3500); // Show for 3.5 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!result || !user) return null;

  const amILoser = result.loser_id === user.id;
  const label = amILoser 
    ? (enableTrashTalk ? "MOGGADO" : "DERROTADO") 
    : "VENCEDOR";
  
  const color = amILoser ? "text-red-600" : "text-amber-500";
  const bg = amILoser ? "bg-red-500/10" : "bg-amber-500/10";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
        >
          {/* Glitch Effect Background */}
          <div className={`absolute inset-0 ${bg} mix-blend-overlay animate-pulse`} />
          
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="relative z-10 text-center"
          >
            <h1 className={`text-6xl md:text-8xl font-black ${color} tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]`}
                style={{ fontFamily: 'Impact, sans-serif' }}
            >
              {label}
            </h1>
            
            {amILoser && enableTrashTalk && (
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    delay={0.5}
                    className="text-white/50 text-sm mt-4 uppercase tracking-widest"
                >
                    Não foi dessa vez...
                </motion.p>
            )}
          </motion.div>

          {/* Screen Shake Effect for Loser */}
          {amILoser && (
             <style>{`
                @keyframes shake {
                  0% { transform: translate(1px, 1px) rotate(0deg); }
                  10% { transform: translate(-1px, -2px) rotate(-1deg); }
                  20% { transform: translate(-3px, 0px) rotate(1deg); }
                  30% { transform: translate(3px, 2px) rotate(0deg); }
                  40% { transform: translate(1px, -1px) rotate(1deg); }
                  50% { transform: translate(-1px, 2px) rotate(-1deg); }
                  60% { transform: translate(-3px, 1px) rotate(0deg); }
                  70% { transform: translate(3px, 1px) rotate(-1deg); }
                  80% { transform: translate(-1px, -1px) rotate(1deg); }
                  90% { transform: translate(1px, 2px) rotate(0deg); }
                  100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                body { animation: shake 0.5s; animation-iteration-count: 1; }
             `}</style>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
