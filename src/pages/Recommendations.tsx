import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnalysisHistory } from "@/lib/mockData";
import { generatePersonalizedPlan, PersonalizedPlan } from "@/lib/smartTrendsEngine";
import { usePaywallGate } from "@/hooks/usePaywallGate";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  Droplets, 
  Scissors, 
  Dumbbell, 
  PersonStanding, 
  Shirt, 
  Zap, 
  Target, 
  Eye, 
  Scan, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  BookOpen,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const catIcons: Record<string, React.ElementType> = { 
  skincare: Droplets, 
  cabelo: Scissors, 
  exercicio: Dumbbell, 
  habito: PersonStanding, 
  estilo: Shirt, 
  procedimento: Activity 
};

const priorityColors: Record<string, string> = {
  critica: "bg-red-500/20 text-red-400 border-red-500/30",
  alta: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  media: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
};

const evidenceColors: Record<string, string> = {
  "Alta": "bg-green-500/20 text-green-400 border-green-500/30",
  "Moderada": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Baixa": "bg-gray-500/20 text-gray-400 border-gray-500/30"
};

export default function Recommendations() {
  const [plan, setPlan] = useState<PersonalizedPlan | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { checkGate } = usePaywallGate();

  useEffect(() => {
    // Paywall Check (Hard Gate for Premium Plan)
    checkGate({ trigger: 'feature_locked', featureName: 'recommendations_plan' });

    const history = getAnalysisHistory();
    if (history.length > 0) {
      const latest = history[0];
      const generatedPlan = generatePersonalizedPlan(latest as any);
      setPlan(generatedPlan);
      // Auto-expand first item if available
      if (generatedPlan.trends.length > 0) {
        setExpanded(generatedPlan.trends[0].id);
      }
    }
  }, []);

  if (!plan) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4 text-center">
        <Zap className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Nenhum plano encontrado</h2>
        <p className="text-muted-foreground mb-6">Realize uma análise facial para gerar seu plano personalizado.</p>
        <Link to="/analysis">
          <Button>Iniciar Análise</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 bg-background text-foreground">
      <div className="container max-w-lg mx-auto">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-primary/10 rounded-full">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h1 className="font-heading text-xl font-bold">Plano de Evolução</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Estratégia dinâmica baseada no seu diagnóstico estrutural.
            </p>
          </div>
          
          <div className="text-right">
             <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Score Geral</span>
                <span className="text-3xl font-bold text-primary leading-none">{(plan.gerScore / 10).toFixed(1)}</span>
             </div>
             <Link to="/progress" className="flex items-center gap-1 text-[10px] text-primary mt-1 hover:underline justify-end">
               <TrendingUp className="h-3 w-3" /> Ver Progresso
             </Link>
          </div>
        </motion.div>

        {/* Diagnóstico Estrutural / Prioridades */}
        {plan.bottlenecks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Diagnóstico Estrutural
              </h2>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {plan.bottlenecks.length} Prioridades
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {plan.bottlenecks.map((item, i) => (
                <div key={item.id} className="glass p-3 rounded-xl flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${priorityColors[item.priority] || "bg-muted"}`}>
                      {item.icon === "Target" && <Target className="h-4 w-4" />}
                      {item.icon === "Eye" && <Eye className="h-4 w-4" />}
                      {item.icon === "Droplets" && <Droplets className="h-4 w-4" />}
                      {item.icon === "Scissors" && <Scissors className="h-4 w-4" />}
                      {item.icon === "Scan" && <Scan className="h-4 w-4" />}
                      {item.icon === "Zap" && <Zap className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.area}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Severidade:</span>
                        <div className="h-1.5 w-16 bg-muted/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary/70 rounded-full" 
                            style={{ width: `${(item.severity || 5) * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] uppercase border ${priorityColors[item.priority]}`}>
                    {item.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Intervenções Dinâmicas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Intervenções Selecionadas</h2>
          </div>

          {plan.trends.map((trend, i) => {
            const Icon = catIcons[trend.category] || Zap;
            const isOpen = expanded === trend.id;
            
            return (
              <motion.div 
                key={trend.id} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen ? "bg-card border-primary/30 shadow-lg shadow-primary/5" : "glass border-white/5"
                }`}
              >
                {/* Card Header */}
                <button 
                  className="w-full p-4 flex items-start gap-3 text-left" 
                  onClick={() => setExpanded(isOpen ? null : trend.id)}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm leading-tight mb-1">{trend.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{trend.subtitle}</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                    
                    {!isOpen && (
                      <div className="mt-2 flex items-center gap-2">
                         <Badge variant="secondary" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/10">
                            {trend.category}
                         </Badge>
                         <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {trend.duration}
                         </span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: "auto", opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 pt-0 space-y-5">
                        
                        {/* Justificativa Personalizada */}
                        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Scan className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Por que para você?</span>
                          </div>
                          <p className="text-xs text-foreground/90 leading-relaxed">
                            {trend.reason}
                          </p>
                        </div>

                        {/* Tutorial / Passos */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Tutorial Prático
                          </h4>
                          <div className="space-y-3">
                            {trend.steps.map((step, idx) => (
                              <div key={idx} className="relative pl-4 border-l-2 border-muted/30">
                                <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/20 ring-2 ring-background" />
                                <p className="text-xs font-semibold text-foreground mb-0.5">{step.text}</p>
                                {step.detail && <p className="text-[11px] text-muted-foreground leading-relaxed">{step.detail}</p>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Meta Info Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-muted/30 rounded-lg p-2.5">
                            <span className="text-[10px] text-muted-foreground block mb-1">Tempo Estimado</span>
                            <span className="text-xs font-medium flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              {trend.duration}
                            </span>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2.5">
                            <span className="text-[10px] text-muted-foreground block mb-1">Evidência Científica</span>
                            <Badge variant="outline" className={`text-[10px] border-0 h-5 px-1.5 ${evidenceColors[trend.validation] || "bg-muted"}`}>
                              {trend.validation}
                            </Badge>
                          </div>
                        </div>

                        {/* Ciência / Explicação */}
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Base Científica
                          </h4>
                          <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3">
                            "{trend.science}"
                          </p>
                        </div>

                        {/* Aviso / Contraindicação */}
                        {(trend.disclaimer || trend.warning) && (
                          <div className="flex gap-2 items-start bg-yellow-500/5 p-2.5 rounded-lg border border-yellow-500/10">
                            <AlertTriangle className="h-4 w-4 text-yellow-500/70 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-yellow-600/90 dark:text-yellow-400/90 leading-relaxed">
                              {trend.warning || trend.disclaimer}
                            </p>
                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {trend.tags.map((tag) => (
                            <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-white/5">
                              #{tag}
                            </span>
                          ))}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
