import { motion } from "framer-motion";
import { Flame, Snowflake, Scissors, Droplets, Dumbbell, ChevronRight, Zap, Clock, TrendingUp } from "lucide-react";

interface Trend {
  id: string;
  title: string;
  description: string;
  howTo: string;
  duration: string;
  impact: number;
  icon: React.ElementType;
  hot?: boolean;
}

const trends: Trend[] = [
  {
    id: "1", title: "Ice Face", description: "Mergulhe o rosto em água gelada para reduzir inchaço e fechar poros.",
    howTo: "Encha uma tigela com água gelada e cubos de gelo. Mergulhe o rosto por 15-30 segundos. Repita 3x.",
    duration: "5 min/dia", impact: 7, icon: Snowflake, hot: true,
  },
  {
    id: "2", title: "Jaw Training", description: "Exercite a mandíbula para definição e simetria facial.",
    howTo: "Use um jaw exerciser por 10 minutos diários. Alterne entre mastigação forte e resistência lateral.",
    duration: "10 min/dia", impact: 8, icon: Dumbbell, hot: true,
  },
  {
    id: "3", title: "Skin Minimalism", description: "Reduza sua rotina a 3 produtos essenciais para pele mais saudável.",
    howTo: "Use apenas: limpeza suave, hidratante e protetor solar. Elimine produtos desnecessários por 30 dias.",
    duration: "30 dias", impact: 6, icon: Droplets,
  },
  {
    id: "4", title: "Corte Textured Crop", description: "O corte mais viral do momento para maximizar sua estrutura facial.",
    howTo: "Peça ao barbeiro: fade baixo nas laterais, textura no topo com franja desfiada para a frente.",
    duration: "A cada 3 semanas", impact: 9, icon: Scissors,
  },
  {
    id: "5", title: "Beard Shaping", description: "Contorne a barba para criar a ilusão de mandíbula mais angulada.",
    howTo: "Defina a linha do pescoço 2 dedos acima do pomo de Adão. Mantenha as laterais alinhadas com o maxilar.",
    duration: "3x/semana", impact: 7, icon: Scissors,
  },
];

export default function Trends() {
  return (
    <div className="min-h-screen pt-6 pb-28 px-4">
      <div className="container max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-5 w-5 text-orange-400" />
            <h1 className="font-heading text-xl font-bold text-foreground">Trends</h1>
          </div>
          <p className="text-sm text-muted-foreground">O que está funcionando agora no looksmaxing.</p>
        </motion.div>

        {/* Featured */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-3xl glass-strong p-5 mb-6 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider">
                🔥 Mais popular
              </span>
            </div>
            <h2 className="font-heading text-lg font-bold text-foreground mb-1">{trends[1].title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{trends[1].description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {trends[1].duration}</span>
              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-success" /> Impacto {trends[1].impact}/10</span>
            </div>
          </div>
        </motion.div>

        {/* All Trends */}
        <div className="space-y-3">
          {trends.map((trend, i) => {
            const Icon = trend.icon;
            return (
              <motion.div key={trend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="rounded-2xl glass p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{trend.title}</span>
                      {trend.hot && <Flame className="h-3 w-3 text-orange-400" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{trend.description}</p>
                    <div className="rounded-xl bg-muted/50 p-3 mb-2">
                      <p className="text-xs text-foreground/80 font-medium mb-1">Como aplicar:</p>
                      <p className="text-xs text-muted-foreground">{trend.howTo}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {trend.duration}</span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-primary" /> Impacto: {trend.impact}/10
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
