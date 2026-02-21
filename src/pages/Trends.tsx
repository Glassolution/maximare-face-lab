import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Zap, Clock, TrendingUp, ChevronDown, ChevronRight, AlertTriangle,
  Eye, Droplets, Target, Scan, Sparkles, Scissors, Diamond,
  ShieldCheck, Smartphone, FlaskConical, RotateCcw, Camera,
  BookOpen, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generatePersonalizedPlan, type SmartTrend, type FacialBottleneck } from "@/lib/smartTrendsEngine";
import { getAnalysisHistory } from "@/lib/mockData";
import { ExtendedAnalysisResult } from "@/lib/rankingSystem";

const iconMap: Record<string, React.ElementType> = {
  Eye, Droplets, Target, Scan, Sparkles, Scissors, Diamond, Zap,
};

const priorityConfig = {
  critica: { label: "Prioridade Crítica", color: "bg-destructive/15 text-destructive", border: "border-destructive/20" },
  alta: { label: "Prioridade Alta", color: "bg-warning/15 text-warning", border: "border-warning/20" },
  media: { label: "Prioridade Média", color: "bg-primary/15 text-primary", border: "border-primary/20" },
};

const validationConfig = {
  cientifica: { label: "Cientificamente validada", icon: ShieldCheck, color: "text-success" },
  viral: { label: "Viral & Tendência", icon: Smartphone, color: "text-orange-400" },
  experimental: { label: "Experimental", icon: FlaskConical, color: "text-purple-400" },
};

export default function Trends() {
  const navigate = useNavigate();
  const [expandedTrend, setExpandedTrend] = useState<string | null>(null);

  const plan = useMemo(() => {
    const history = getAnalysisHistory();
    // Get the most recent analysis
    const latest = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return generatePersonalizedPlan(latest as unknown as ExtendedAnalysisResult);
  }, []);

  // ─── No Analysis State ───
  if (!plan.hasAnalysis) {
    return (
      <div className="min-h-screen pt-6 pb-28 px-4">
        <div className="container max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Scan className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Plano Personalizado</h1>
            <p className="text-muted-foreground max-w-xs mb-4">
            Faça sua primeira análise de Aura para receber recomendações baseadas na sua estrutura facial única.
          </p>
          <Button onClick={() => navigate("/analysis")} className="mt-2 rounded-2xl py-6 px-8 glow-primary">
            <Camera className="h-5 w-5 mr-2" /> Fazer Análise de Aura
          </Button>
        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="min-h-screen pt-6 pb-28 px-4">
      <div className="container max-w-lg mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="font-heading text-xl font-bold text-foreground">Plano de Evolução Facial</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Recomendações baseadas na sua estrutura facial • Aura {plan.gerScore}
          </p>
        </motion.div>

        {/* Bottleneck Summary */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}
          className="rounded-2xl glass-strong p-4 mb-6"
        >
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Áreas Identificadas para Melhoria
          </h3>
          <div className="space-y-2">
            {plan.bottlenecks.slice(0, 4).map((b) => {
              const Icon = iconMap[b.icon] || Zap;
              const cfg = priorityConfig[b.priority];
              return (
                <div key={b.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-foreground truncate">{b.area}</span>
                      <span className="text-xs font-bold text-foreground">{Math.round(b.score)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.score >= 80 ? 'bg-success' : b.score >= 65 ? 'bg-warning' : b.score >= 50 ? 'bg-orange-400' : 'bg-destructive'}`}
                        style={{ width: `${b.score}%` }}
                      />
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${cfg.color}`}>
                    {b.priority === "critica" ? "!" : b.priority === "alta" ? "▲" : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Personalized Trends */}
        <div className="space-y-3">
          {plan.trends.map((trend, i) => {
            const isOpen = expandedTrend === trend.id;
            const areaPriority = plan.bottlenecks.find((b) => b.id === trend.area);
            const pConfig = areaPriority ? priorityConfig[areaPriority.priority] : priorityConfig.media;
            const vConfig = validationConfig[trend.validation];
            const VIcon = vConfig.icon;

            return (
              <motion.div key={trend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.03 }}
                className={`rounded-2xl glass overflow-hidden border ${isOpen ? pConfig.border : "border-transparent"}`}
              >
                {/* Card Header */}
                <button className="w-full p-4 text-left" onClick={() => setExpandedTrend(isOpen ? null : trend.id)}>
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{trend.title}</span>
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold ${pConfig.color}`}>
                          {areaPriority ? `${areaPriority.area}` : trend.area}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{trend.subtitle}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {trend.duration}</span>
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> Impacto {trend.impactEstimate}/10</span>
                        <span className={`flex items-center gap-1 ${vConfig.color}`}><VIcon className="h-3 w-3" /> {vConfig.label.split(" ")[0]}</span>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Expanded Tutorial */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-border/20 pt-4 space-y-4">

                        {/* Why You Need This */}
                        <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                          <h4 className="text-xs font-bold text-primary mb-1 flex items-center gap-1">
                            <Target className="h-3 w-3" /> Por que você precisa disso
                          </h4>
                          <p className="text-xs text-muted-foreground">{trend.reason}</p>
                          <p className="text-[10px] text-foreground/60 mt-1">
                            Score atual: <span className="font-bold text-foreground">{Math.round(trend.areaScore)}/99</span>
                          </p>
                        </div>

                        {/* Scientific Explanation */}
                        <div className="rounded-xl bg-secondary/30 p-3">
                          <h4 className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> Base científica
                          </h4>
                          <p className="text-xs text-muted-foreground">{trend.science}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <VIcon className={`h-3 w-3 ${vConfig.color}`} />
                            <span className={`text-[10px] font-semibold ${vConfig.color}`}>{vConfig.label}</span>
                          </div>
                        </div>

                        {/* Steps */}
                        <div>
                          <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-success" /> Passo a passo
                          </h4>
                          <ol className="space-y-2">
                            {trend.steps.map((s, j) => (
                              <li key={j} className="flex gap-2">
                                <span className="text-primary font-bold text-xs mt-0.5">{j + 1}.</span>
                                <div>
                                  <p className="text-xs text-foreground font-medium">{s.text}</p>
                                  {s.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{s.detail}</p>}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Duration & Frequency */}
                        <div className="flex gap-3">
                          <div className="flex-1 rounded-xl bg-muted/30 p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Duração</p>
                            <p className="text-sm font-bold text-foreground">{trend.duration}</p>
                          </div>
                          <div className="flex-1 rounded-xl bg-muted/30 p-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Frequência</p>
                            <p className="text-sm font-bold text-foreground">{trend.frequency}</p>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {trend.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] rounded-lg glass border-0">{tag}</Badge>
                          ))}
                        </div>

                        {/* Disclaimer */}
                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground/70">
                          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                          <p>{trend.disclaimer}</p>
                        </div>

                        {/* CTA */}
                        <Button onClick={() => navigate("/analysis")} variant="outline" className="mt-3 w-full rounded-xl glass border-primary/20 text-primary hover:text-primary">
                          <RotateCcw className="h-4 w-4 mr-2" /> Reanalisar esta área
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Footer disclaimer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-8 text-center px-4"
        >
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
            ⚠️ Este conteúdo é informativo e baseado em padrões visuais. Não substitui orientação médica ou dermatológica profissional.
            Resultados podem variar individualmente.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
