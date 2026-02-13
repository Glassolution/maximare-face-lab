import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scan, Lightbulb, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Scan,
    title: "Análise facial precisa com IA",
    description: "Tecnologia avançada analisa proporções, simetria e harmonia do seu rosto.",
  },
  {
    icon: Lightbulb,
    title: "Recomendações personalizadas",
    description: "Plano de melhoria sob medida baseado nos seus pontos fortes e fracos.",
  },
  {
    icon: TrendingUp,
    title: "Acompanhe sua evolução",
    description: "Monitore seu progresso ao longo do tempo e veja resultados reais.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            Powered by IA
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
            Maximize seu
            <br />
            <span className="text-primary">potencial estético</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            Análise facial com IA + Recomendações personalizadas para você alcançar a melhor versão de si mesmo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Link to="/analysis">
            <Button size="lg" className="rounded-2xl px-8 py-6 text-base font-semibold gap-2">
              Começar análise gratuita
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Benefits */}
      <section className="px-4 pb-20">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="container grid gap-4 sm:grid-cols-3 max-w-4xl"
        >
          {benefits.map((b) => (
            <motion.div
              key={b.title}
              variants={item}
              className="rounded-2xl border border-border/50 bg-card p-6 text-center hover:border-primary/30 transition-colors"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <b.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
