import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { BattleResult } from "@/types/battle";
import { useAuth } from "@/hooks/useAuth";

interface LoserRevealOverlayProps {
  result: BattleResult | null;
  userPhoto?: string | null;
  onComplete: () => void;
}

export function LoserRevealOverlay({ result, userPhoto, onComplete }: LoserRevealOverlayProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'suspense' | 'reveal'>('suspense');

  useEffect(() => {
    // Phase 1: Suspense (Black screen, heartbeat)
    const suspenseTimer = setTimeout(() => {
      setStep('reveal');
    }, 2000);

    // Phase 2: Reveal (Photo + Text) -> Exit
    const revealTimer = setTimeout(() => {
      onComplete();
    }, 6000); // 2s suspense + 4s reveal

    return () => {
      clearTimeout(suspenseTimer);
      clearTimeout(revealTimer);
    };
  }, [onComplete]);

  if (!result || !user) return null;

  const amILoser = result.loser_id === user.id;
  const label = amILoser ? "MOGGADO" : "ASCENDEU";
  const color = amILoser ? "text-red-600" : "text-amber-400";
  const shadowColor = amILoser ? "rgba(220, 38, 38, 0.5)" : "rgba(251, 191, 36, 0.5)";

  return (
    <AnimatePresence mode="wait">
      {step === 'suspense' && (
        <motion.div
          key="suspense"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]"
          />
        </motion.div>
      )}

      {step === 'reveal' && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black overflow-hidden"
        >
          {/* Background Photo */}
          {userPhoto && (
            <motion.div 
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-0"
            >
              <img src={userPhoto} className="w-full h-full object-cover grayscale opacity-50" alt="Background" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </motion.div>
          )}

          {/* Text Reveal with Impact */}
          <motion.div
            initial={{ scale: 2, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              delay: 0.2 
            }}
            className="relative z-10 text-center px-4"
          >
            <h1 
              className={`text-6xl md:text-9xl font-black ${color} tracking-tighter uppercase`}
              style={{ 
                fontFamily: 'Impact, sans-serif',
                textShadow: `0 0 30px ${shadowColor}, 0 0 10px black`
              }}
            >
              {label}
            </h1>
            
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className={`h-2 mx-auto mt-2 ${amILoser ? 'bg-red-600' : 'bg-amber-400'}`}
            />
          </motion.div>

          {/* Flash Effect on Entry */}
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white z-20 pointer-events-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
