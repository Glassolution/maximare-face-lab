import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Clock, TrendingUp, ChevronDown, AlertTriangle,
  Eye, Droplets, Target, Scan, Sparkles, Scissors, Diamond,
  ShieldCheck, Smartphone, FlaskConical, RotateCcw, Camera,
  BookOpen, CheckCircle2, XCircle, ThumbsUp, Activity, User, Waves, Leaf, TestTube,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generatePersonalizedPlan, type SmartTrend, type FacialBottleneck } from "@/lib/smartTrendsEngine";
import { getAnalysisHistory } from "@/lib/mockData";
import { ExtendedAnalysisResult } from "@/lib/rankingSystem";
import { usePaywallGate } from "@/hooks/usePaywallGate";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { PaywallDialog } from "@/components/paywall/PaywallDialog";
import { cn } from "@/lib/utils";

// Icon mapping based on protocol type
const getProtocolIcon = (category: string, id: string) => {
  if (id.includes("retinol")) return TestTube;
  if (id.includes("mewing")) return Activity;
  if (id.includes("chin")) return User;
  if (id.includes("neck")) return User;
  if (category === "skincare") return Leaf;
  if (category === "exercicio") return Activity;
  if (id.includes("lymphatic")) return Waves;
  if (id.includes("ice")) return Waves;
  return Sparkles;
};

// Category colors for border styling
const getCategoryColor = (category: string, id: string) => {
  if (id.includes("retinol") || category === "skincare") return "#4F6EF7"; // skin - primary blue
  if (id.includes("mewing") || id.includes("chin") || category === "exercicio") return "#A855F7"; // structure - purple
  if (id.includes("neck") || id.includes("posture")) return "#22C55E"; // posture - green
  return "#4F6EF7";
};

// Translation map for tabs
const TAB_LABELS: Record<string, string> = {
  "All Protocols": "Todos",
  "Skin": "Pele",
  "Structure": "Estrutura",
  "Posture": "Postura"
};

export default function Trends() {
  const navigate = useNavigate();
  const [expandedTrend, setExpandedTrend] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("All Protocols");
  const { checkGate, isPaywallOpen, closePaywall } = usePaywallGate();
  const { isPremium, loading } = usePremiumStatus();

  // Premium-only: entrada bloqueada para FREE
  useEffect(() => {
    if (loading) return;
    if (isPremium) return;
    checkGate({ trigger: "feature_locked", featureName: "personalized_plan" });
  }, [checkGate, isPremium, loading]);

  const plan = useMemo(() => {
    const history = getAnalysisHistory();
    const latest = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return generatePersonalizedPlan(latest as unknown as ExtendedAnalysisResult);
  }, []);

  // Filter trends based on active tab
  const filteredTrends = useMemo(() => {
    if (activeTab === "All Protocols") return plan.trends;
    if (activeTab === "Skin") return plan.trends.filter(t => t.category === "skincare");
    if (activeTab === "Structure") return plan.trends.filter(t => ["exercicio", "habito", "procedimento"].includes(t.category) && !t.id.includes("posture") && !t.id.includes("neck"));
    if (activeTab === "Posture") return plan.trends.filter(t => t.id.includes("neck") || t.id.includes("chin") || t.id.includes("posture"));
    return plan.trends;
  }, [plan.trends, activeTab]);

  // Scores for header cards
  const scores = useMemo(() => {
    const getScore = (id: string) => {
        const bottleneck = plan.bottlenecks.find(b => b.area.toLowerCase().includes(id));
        return bottleneck ? Math.round(bottleneck.score) : 80;
    };

    return [
        { label: "Pele", score: getScore("pele"), change: "+3" },
        { label: "Mandíbula", score: getScore("mandíbula") || getScore("projecao") || 85, change: "+1" },
        { label: "Simetria", score: getScore("simetria") || 85, change: "+2" }
    ];
  }, [plan.bottlenecks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D14] pt-6 pb-20 px-4 flex flex-col items-center justify-center">
        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Sparkles className="h-10 w-10 text-white/70 animate-pulse" />
        </div>
        <h1 className="font-semibold text-2xl text-white mb-2">Carregando...</h1>
        <p className="text-white/50 text-center max-w-xs text-sm">
          Preparando seu plano personalizado.
        </p>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-[#0D0D14] pt-6 pb-20 px-4 flex flex-col items-center justify-center">
        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <ShieldCheck className="h-10 w-10 text-white/70" />
        </div>
        <h1 className="font-semibold text-2xl text-white mb-2">Recurso Premium</h1>
        <p className="text-white/50 text-center max-w-xs mb-6 text-sm">
          O plano personalizado é exclusivo para assinantes Premium.
        </p>
        <Button
          onClick={() => checkGate({ trigger: "feature_locked", featureName: "personalized_plan" })}
          className="rounded-full bg-[#4F6EF7] text-white hover:bg-[#4F6EF7]/90"
        >
          Desbloquear Premium
        </Button>
      </div>
    );
  }

  if (!plan.hasAnalysis) {
    return (
      <div className="min-h-screen bg-[#0D0D14] pt-6 pb-20 px-4 flex flex-col items-center justify-center">
        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Scan className="h-10 w-10 text-white" />
        </div>
        <h1 className="font-semibold text-2xl text-white mb-2">Plano Estrutural</h1>
        <p className="text-white/50 text-center max-w-xs mb-6 text-sm">
          Faça sua análise para desbloquear seu plano personalizado.
        </p>
        <Button
          onClick={() => navigate("/analysis")}
          className="rounded-full bg-[#4F6EF7] text-white hover:bg-[#4F6EF7]/90"
        >
          <Camera className="h-4 w-4 mr-2" /> Iniciar Análise
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D14] pt-12 pb-32 overflow-x-hidden">
      <div className="container max-w-[430px] mx-auto px-6">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[22px] font-semibold tracking-tight text-white">Seu Plano</h1>
          <p className="text-[13px] text-white/50 mt-1">Baseado na sua análise facial</p>
        </header>

        {/* Score Cards - Horizontal Scroll */}
        <div className="mb-8 overflow-x-auto hide-scrollbar">
          <div className="flex gap-2.5 min-w-full">
            {scores.map((s, i) => (
              <div
                key={i}
                className="bg-[#13131F] border border-white/[0.08] p-3 rounded-2xl flex-1 flex flex-col items-center min-w-[100px]"
              >
                <span className="text-[9px] font-bold tracking-widest uppercase text-white/50 mb-2">{s.label}</span>
                <span className="text-xl font-bold text-[#4F6EF7] mb-2">{s.score}</span>
                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-[#4F6EF7] h-full transition-all duration-1000 ease-out"
                    style={{ width: `${s.score}%` }}
                  />
                </div>
                <span className="text-[9px] text-[#22C55E] font-medium mt-2">↑ {s.change} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 overflow-x-auto hide-scrollbar">
          <div className="flex gap-2 w-max pr-6">
            {["All Protocols", "Skin", "Structure", "Posture"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab
                    ? "bg-[#4F6EF7] text-white"
                    : "bg-[#13131F] text-white/50 hover:text-white/70"
                )}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Protocol Cards */}
        <div className="space-y-4">
          {filteredTrends.map((trend, index) => {
            const Icon = getProtocolIcon(trend.category, trend.id);
            const categoryColor = getCategoryColor(trend.category, trend.id);
            const isHighEvidence = trend.validation === "Alta";

            return (
              <motion.div
                key={trend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={async () => {
                  setExpandedTrend(trend.id);
                  await checkGate({ trigger: 'report_view' });
                }}
                className="bg-[#13131F] rounded-2xl overflow-hidden border-l-4 shadow-sm cursor-pointer hover:bg-[#13131F]/80 transition-colors"
                style={{ borderLeftColor: categoryColor }}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className="px-2 py-1 text-[9px] font-bold tracking-wider rounded uppercase"
                      style={{
                        backgroundColor: `${categoryColor}15`,
                        color: categoryColor
                      }}
                    >
                      {isHighEvidence ? "Alta Evidência" : "Evidência Moderada"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{trend.title}</h3>
                  <p className="text-sm text-white/50 mb-6">{trend.subtitle}</p>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Frequência</span>
                      <span className="text-sm font-medium text-white mt-1">{trend.frequency.split(' ')[0]}</span>
                    </div>
                    <div className="flex flex-col items-end flex-1 max-w-[120px]">
                      <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-2">Impacto</span>
                      <div className="w-full bg-white/10 h-[4px] rounded-full overflow-hidden">
                        <div
                          className="bg-[#4F6EF7] h-full rounded-full"
                          style={{ width: `${(trend.impactEstimate / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Premium CTA */}
        <div className="bg-[#4F6EF7]/5 border border-[#4F6EF7]/20 rounded-2xl p-5 flex items-center justify-between mt-6">
          <span className="text-xs font-medium text-white/80">+ {Math.max(0, plan.trends.length - filteredTrends.length)} protocolos disponíveis no Premium</span>
          <button
            onClick={() => navigate('/premium')}
            className="bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white text-[11px] font-bold py-2 px-4 rounded-lg flex items-center transition-all"
          >
            Desbloquear <ArrowRight className="ml-1 w-3 h-3" />
          </button>
        </div>

        {/* Disclaimer */}
        <div className="pt-8 pb-4">
          <p className="text-[11px] text-center text-white/30 leading-relaxed px-6">
            Protocolos científicos baseados em análise craniofacial.<br/>
            Consulte um especialista para orientação médica.
          </p>
        </div>

        {/* Expanded Modal */}
        <AnimatePresence>
          {expandedTrend && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setExpandedTrend(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-x-0 bottom-0 top-[5%] bg-[#13131F] border-t border-white/10 rounded-t-[32px] z-50 overflow-hidden flex flex-col"
              >
                {(() => {
                  const trend = plan.trends.find(t => t.id === expandedTrend);
                  if (!trend) return null;
                  const Icon = getProtocolIcon(trend.category, trend.id);
                  const categoryColor = getCategoryColor(trend.category, trend.id);

                  return (
                    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
                      {/* Header */}
                      <div className="p-6 pb-4 border-b border-white/5 sticky top-0 bg-[#13131F]/95 backdrop-blur z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className="h-12 w-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <button
                            onClick={() => setExpandedTrend(null)}
                            className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
                          >
                            <XCircle className="h-5 w-5 text-white/60" />
                          </button>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">{trend.title}</h2>
                        <p className="text-white/60 text-sm">{trend.subtitle}</p>
                      </div>

                      {/* Content */}
                      <div className="p-6 space-y-8">

                        {/* Science */}
                        <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                            <BookOpen className="h-3 w-3" style={{ color: categoryColor }} /> A Ciência
                          </h4>
                          <p className="text-white/80 text-sm leading-relaxed">
                            {trend.science}
                          </p>
                        </div>

                        {/* Steps */}
                        <div>
                          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" style={{ color: categoryColor }} /> Passo a Passo
                          </h4>
                          <div className="space-y-4">
                            {trend.steps.map((step, idx) => (
                              <div key={idx} className="flex gap-4">
                                <div
                                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                  style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                                >
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm mb-1">{step.text}</p>
                                  {step.detail && (
                                    <p className="text-white/50 text-xs leading-relaxed">{step.detail}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Common Errors */}
                        {trend.common_errors && (
                          <div className="bg-red-500/10 rounded-2xl p-4 border border-red-500/20">
                            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <AlertTriangle className="h-3 w-3" /> Erros Comuns
                            </h4>
                            <ul className="space-y-2">
                              {trend.common_errors.map((err, idx) => (
                                <li key={idx} className="text-red-200/80 text-xs flex gap-2">
                                  <span>•</span> {err}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Success Signs */}
                        {trend.success_signs && (
                          <div className="bg-green-500/10 rounded-2xl p-4 border border-green-500/20">
                            <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <ThumbsUp className="h-3 w-3" /> Sinais de Progresso
                            </h4>
                            <ul className="space-y-2">
                              {trend.success_signs.map((sign, idx) => (
                                <li key={idx} className="text-green-200/80 text-xs flex gap-2">
                                  <span>•</span> {sign}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Duração</p>
                            <p className="text-white font-bold text-sm">{trend.session_duration || trend.duration}</p>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Frequência</p>
                            <p className="text-white font-bold text-sm">{trend.frequency}</p>
                          </div>
                        </div>

                        {/* Disclaimer */}
                        <p className="text-[10px] text-white/30 text-center leading-relaxed pb-4">
                          {trend.disclaimer}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <PaywallDialog isOpen={isPaywallOpen} onClose={closePaywall} />
      </div>
    </div>
  );
}
