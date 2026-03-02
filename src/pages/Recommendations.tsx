import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnalysisHistory } from "@/lib/mockData";
import { generatePersonalizedPlan, PersonalizedPlan, SmartTrend, ScientificReference } from "@/lib/smartTrendsEngine";
import { usePaywallGate } from "@/hooks/usePaywallGate";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import {
  ChevronDown,
  Zap,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Shield,
  ExternalLink,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import TutorialStepByStep from "@/components/TutorialStepByStep";

// ─── Phase Labels ───
const phaseLabels: Record<string, { label: string; order: number }> = {
  week1: { label: "Semana 1", order: 0 },
  week2_4: { label: "Semana 2–4", order: 1 },
  month2_plus: { label: "Mês 2+", order: 2 },
};

// ─── Evidence Badge ───
function EvidenceBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Alta: "bg-success/10 text-success border-success/20",
    Moderada: "bg-primary/10 text-primary border-primary/20",
    Baixa: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${styles[level] || styles.Baixa}`}>
      {level}
    </span>
  );
}

// ─── Protocol Card ───
function ProtocolCard({
  trend,
  isOpen,
  onToggle,
  onOpenTutorial,
  index,
}: {
  trend: SmartTrend;
  isOpen: boolean;
  onToggle: () => void;
  onOpenTutorial: () => void;
  index: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen ? "bg-card border-primary/20" : "bg-card/50 border-border/30"
      }`}
    >
      {/* Header */}
      <button className="w-full p-4 flex items-center gap-3 text-left" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-foreground leading-tight truncate">{trend.title}</h3>
            <EvidenceBadge level={trend.validation} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{trend.subtitle}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-4">
              {/* Why for you */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] uppercase tracking-widest text-primary font-mono mb-1">Por que para você</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{trend.reason}</p>
              </div>

              {/* Steps */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> Passo a passo
                </p>
                <div className="space-y-2">
                  {trend.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-[10px] font-mono text-muted-foreground mt-0.5 w-4 shrink-0">{i + 1}.</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{step.text}</p>
                        {step.detail && <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{step.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta */}
              <div className="flex gap-3">
                <div className="flex-1 p-2.5 rounded-lg bg-muted/20">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Frequência</p>
                  <p className="text-xs font-medium text-foreground">{trend.frequency}</p>
                </div>
                <div className="flex-1 p-2.5 rounded-lg bg-muted/20">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Resultados em</p>
                  <p className="text-xs font-medium text-foreground">{trend.duration}</p>
                </div>
              </div>

              {/* Contraindications */}
              {trend.contraindications && trend.contraindications.length > 0 && (
                <div className="p-3 rounded-xl bg-warning/5 border border-warning/10">
                  <p className="text-[10px] uppercase tracking-widest text-warning/70 font-mono mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Contraindicações
                  </p>
                  <ul className="space-y-1">
                    {trend.contraindications.map((c, i) => (
                      <li key={i} className="text-[11px] text-foreground/70 flex items-start gap-1.5">
                        <span className="text-warning/50 mt-0.5">•</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning */}
              {trend.warning && (
                <p className="text-[10px] text-muted-foreground italic border-l-2 border-warning/30 pl-3">
                  {trend.warning}
                </p>
              )}

              {/* References */}
              {trend.references && trend.references.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1.5 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> Referências
                  </p>
                  <div className="space-y-1">
                    {trend.references.map((ref, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[9px] text-muted-foreground/50 mt-0.5">[{i + 1}]</span>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {ref.title} ({ref.year}). <span className="italic">{ref.source}</span>
                          {ref.doi && (
                            <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary ml-1">
                              DOI <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Science */}
              <p className="text-[10px] text-muted-foreground italic border-l-2 border-primary/20 pl-3 leading-relaxed">
                {trend.science}
              </p>

              {/* Tutorial button */}
              <button
                onClick={onOpenTutorial}
                className="w-full h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors"
              >
                <Play className="h-4 w-4" /> Ver tutorial
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ───
export default function Recommendations() {
  const [plan, setPlan] = useState<PersonalizedPlan | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tutorialTrend, setTutorialTrend] = useState<SmartTrend | null>(null);
  const { checkGate } = usePaywallGate();
  const { isPremium, loading } = usePremiumStatus();

  useEffect(() => {
    if (loading) return;
    if (isPremium) return;
    // Premium-only: bloqueia entrada e evita gerar/renderizar o plano para free
    checkGate({ trigger: "feature_locked", featureName: "recommendations_plan" });
  }, [checkGate, isPremium, loading]);

  useEffect(() => {
    if (loading) return;
    if (!isPremium) return;
    const history = getAnalysisHistory();
    if (history.length > 0) {
      const latest = history[0];
      const generatedPlan = generatePersonalizedPlan(latest as any);
      setPlan(generatedPlan);
      if (generatedPlan.trends.length > 0) {
        setExpanded(generatedPlan.trends[0].id);
      }
    }
  }, [isPremium, loading]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4 text-center">
        <Zap className="h-10 w-10 text-muted-foreground/40 mb-4 animate-pulse" />
        <h2 className="text-lg font-semibold mb-2">Carregando seu plano...</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">Só um instante.</p>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4 text-center">
        <Zap className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Recurso Premium</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          O plano personalizado é exclusivo para assinantes Premium.
        </p>
        <Button onClick={() => checkGate({ trigger: "feature_locked", featureName: "recommendations_plan" })}>
          Desbloquear Premium
        </Button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4 text-center">
        <Zap className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Nenhum plano encontrado</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">Realize uma análise facial para gerar seu plano personalizado.</p>
        <Link to="/analysis">
          <Button>Iniciar Análise</Button>
        </Link>
      </div>
    );
  }

  // Group trends by phase
  const phaseGroups: Record<string, SmartTrend[]> = {};
  plan.trends.forEach((t) => {
    const phase = t.phase || "week1";
    if (!phaseGroups[phase]) phaseGroups[phase] = [];
    phaseGroups[phase].push(t);
  });

  const sortedPhases = Object.keys(phaseGroups).sort(
    (a, b) => (phaseLabels[a]?.order ?? 99) - (phaseLabels[b]?.order ?? 99)
  );

  // Top 3 focus areas from bottlenecks
  const topFocus = plan.bottlenecks.slice(0, 3);

  // Today's checklist (quick wins from week1 phase)
  const todayActions = plan.trends
    .filter((t) => t.phase === "week1")
    .slice(0, 3)
    .map((t) => ({
      title: t.title,
      time: t.session_duration || t.duration,
    }));

  return (
    <div className="min-h-screen pt-6 pb-28 px-4 bg-background text-foreground">
      <div className="container max-w-lg mx-auto space-y-8">
        
        {/* ─── A) Topo: Score + Focus ─── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Plano de Evolução</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold text-foreground leading-none">{(plan.gerScore / 10).toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">Aura Score</span>
              </div>
            </div>
            <Link to="/progress" className="flex items-center gap-1 text-xs text-primary hover:underline">
              <TrendingUp className="h-3.5 w-3.5" /> Progresso
            </Link>
          </div>

          {/* Focus areas */}
          {topFocus.length > 0 && (
            <div className="flex gap-2">
              {topFocus.map((b, i) => (
                <div
                  key={b.id}
                  className="flex-1 p-3 rounded-xl bg-card border border-border/30"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-mono text-primary">#{i + 1}</span>
                    <Target className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium text-foreground leading-tight truncate">{b.area}</p>
                  <div className="mt-1.5 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${Math.max(5, (b.severity || 5) * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ─── B) O que fazer hoje ─── */}
        {todayActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-3">O que fazer hoje</p>
            <div className="space-y-2">
              {todayActions.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30">
                  <div className="h-5 w-5 rounded-md border border-border/50 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-muted-foreground/40" />
                  </div>
                  <span className="text-sm text-foreground flex-1">{a.title}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {a.time}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── C) Protocolos por fase ─── */}
        {sortedPhases.map((phase) => (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                {phaseLabels[phase]?.label || phase}
              </p>
              <div className="flex-1 h-px bg-border/30" />
            </div>

            <div className="space-y-3">
              {phaseGroups[phase].map((trend, i) => (
                <ProtocolCard
                  key={trend.id}
                  trend={trend}
                  isOpen={expanded === trend.id}
                  onToggle={() => setExpanded(expanded === trend.id ? null : trend.id)}
                  onOpenTutorial={() => setTutorialTrend(trend)}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/10 border border-border/20">
          <Shield className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Este plano é educacional e não substitui orientação médica ou dermatológica. Se tiver condições pré-existentes, consulte um profissional.
          </p>
        </div>
      </div>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {tutorialTrend && (
          <TutorialStepByStep
            trend={tutorialTrend}
            onClose={() => setTutorialTrend(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
