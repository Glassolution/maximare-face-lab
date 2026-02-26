import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentSuccessProps {
  onContinue: () => void;
}

export function PaymentSuccess({ onContinue }: PaymentSuccessProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          duration: 0.5 
        }}
        className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(34,197,94,0.4)]"
      >
        <Check className="w-12 h-12 text-black stroke-[3]" />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-white mb-3"
      >
        Pagamento Confirmado!
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-zinc-400 mb-12 max-w-xs"
      >
        Sua assinatura Premium foi ativada com sucesso. Aproveite todos os recursos exclusivos.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-sm"
      >
        <Button 
          onClick={onContinue}
          className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl text-lg font-semibold transition-colors"
        >
          Continuar
        </Button>
      </motion.div>
    </div>
  );
}
