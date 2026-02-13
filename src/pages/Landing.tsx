import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import faceScanHero from "@/assets/face-scan-hero.jpg";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-[hsl(270,50%,15%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-between px-6 py-12 max-w-md mx-auto w-full">
        {/* Top spacer */}
        <div />

        {/* Hero image + text */}
        <div className="flex flex-col items-center text-center gap-8">
          {/* Face scan image with corner brackets */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative w-64 h-64 sm:w-72 sm:h-72"
          >
            {/* Corner brackets */}
            <div className="absolute -top-3 -left-3 w-8 h-8 border-t-2 border-l-2 border-muted-foreground/50 rounded-tl-lg" />
            <div className="absolute -top-3 -right-3 w-8 h-8 border-t-2 border-r-2 border-muted-foreground/50 rounded-tr-lg" />
            <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-2 border-l-2 border-muted-foreground/50 rounded-bl-lg" />
            <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-2 border-r-2 border-muted-foreground/50 rounded-br-lg" />

            <img
              src={faceScanHero}
              alt="Análise facial com IA"
              className="w-full h-full object-cover rounded-2xl"
            />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Analise
              <br />
              seu rosto
            </h1>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Escaneie seu rosto para ver sua pontuação facial, qualidade de pele, nível de simetria e mais
            </p>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full"
        >
          <Link to="/analysis" className="block">
            <Button
              size="lg"
              className="w-full rounded-2xl py-7 text-base font-bold gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25"
            >
              <ArrowRight className="h-5 w-5" />
              Continuar
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
