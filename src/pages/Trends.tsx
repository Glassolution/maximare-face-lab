import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Clock, TrendingUp, ChevronDown, AlertTriangle,
  Eye, Droplets, Target, Scan, Sparkles, Scissors, Diamond,
  ShieldCheck, Smartphone, FlaskConical, RotateCcw, Camera,
  BookOpen, CheckCircle2, XCircle, ThumbsUp, Activity, User, Waves, Leaf, TestTube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generatePersonalizedPlan, type SmartTrend, type FacialBottleneck } from "@/lib/smartTrendsEngine";
import { getAnalysisHistory } from "@/lib/mockData";
import { ExtendedAnalysisResult } from "@/lib/rankingSystem";
import { usePaywallGate } from "@/hooks/usePaywallGate";
import { cn } from "@/lib/utils";

// Icon mapping based on protocol type
const getProtocolIcon = (category: string, id: string) => {
  if (id.includes("retinol")) return TestTube;
  if (id.includes("mewing")) return Activity; // Represents jaw/bone
  if (id.includes("chin")) return User; // Posture silhouette
  if (id.includes("neck")) return User;
  if (category === "skincare") return Leaf;
  if (category === "exercicio") return Activity;
  if (id.includes("lymphatic")) return Waves;
  if (id.includes("ice")) return Waves;
  return Sparkles; // Default generic
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
  const { checkGate, PaywallDialog } = usePaywallGate();

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

  // Scores for header
  const scores = useMemo(() => {
    // Helper to get score safely
    const getScore = (id: string) => {
        const bottleneck = plan.bottlenecks.find(b => b.area.toLowerCase().includes(id));
        return bottleneck ? Math.round(bottleneck.score) : 85; // Default fallback
    };
    
    return [
        { label: "Pele", score: getScore("pele") },
        { label: "Mandíbula", score: getScore("mandíbula") || getScore("projecao") },
        { label: "Simetria", score: getScore("simetria") }
    ];
  }, [plan.bottlenecks]);


  if (!plan.hasAnalysis) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] pt-6 pb-20 px-4 flex flex-col items-center justify-center">
        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Scan className="h-10 w-10 text-white" />
        </div>
        <h1 className="font-bold text-2xl text-white mb-2">Plano Estrutural</h1>
        <p className="text-white/60 text-center max-w-xs mb-6">
          Faça sua análise para desbloquear seu plano personalizado.
        </p>
        <Button onClick={() => navigate("/analysis")} className="rounded-full bg-white text-black hover:bg-gray-200">
          <Camera className="h-4 w-4 mr-2" /> Iniciar Análise
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] pt-8 pb-24 overflow-x-hidden">
      <div className="container max-w-md mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                Plano de<br/>Melhoria Estrutural
            </h1>
            
            <div className="grid grid-cols-3 gap-3">
                {scores.map((s, i) => (
                    <div key={i} className="bg-[#12121A] border border-white/[0.08] rounded-2xl p-3 flex flex-col items-center">
                        <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">{s.label}</span>
                        <span className="text-white text-xl font-bold mb-2">{s.score}</span>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[#3B82F6] rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${s.score}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
            {["All Protocols", "Skin", "Structure", "Posture"].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                        "whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border",
                        activeTab === tab 
                            ? "bg-[#3B82F6] text-white border-[#3B82F6]" 
                            : "bg-transparent text-white/60 border-white/10 hover:border-white/30"
                    )}
                >
                    {TAB_LABELS[tab]}
                </button>
            ))}
        </div>

        {/* Protocols Carousel */}
        <div className="flex gap-4 overflow-x-auto pb-8 pt-2 px-1 snap-x no-scrollbar">
            {filteredTrends.map((trend) => {
                const Icon = getProtocolIcon(trend.category, trend.id);
                const isHighEvidence = trend.validation === "Alta";
                
                return (
                    <motion.div 
                        key={trend.id}
                        layoutId={trend.id}
                        onClick={async () => {
                            setExpandedTrend(trend.id);
                            await checkGate({ trigger: 'report_view' });
                        }}
                        className="relative flex-shrink-0 w-[220px] h-[300px] bg-[#12121A] border border-white/[0.08] rounded-[24px] p-5 flex flex-col justify-between snap-center cursor-pointer hover:border-white/20 transition-colors group overflow-hidden"
                    >
                        {/* Background Gradient Subtle */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#3B82F6]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                    <Icon className="h-5 w-5 text-[#3B82F6]" />
                                </div>
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "text-[9px] font-bold border-0 px-2 py-0.5 rounded-full",
                                        isHighEvidence ? "bg-[#1D4ED8] text-white" : "bg-white/10 text-white/60"
                                    )}
                                >
                                    {isHighEvidence ? "ALTA EVIDÊNCIA" : "EVIDÊNCIA MODERADA"}
                                </Badge>
                            </div>
                            
                            <h3 className="text-white font-bold text-lg leading-tight mb-2">{trend.title}</h3>
                            <p className="text-white/50 text-xs line-clamp-3">{trend.subtitle}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                                <span className="text-white/40">FREQUÊNCIA</span>
                                <span className="text-white font-medium">{trend.frequency.split(' ')[0]}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                                <span className="text-white/40">IMPACTO</span>
                                <div className="flex items-center gap-1">
                                    <Zap className="h-3 w-3 text-[#3B82F6]" fill="currentColor" />
                                    <span className="text-white font-bold">{trend.impactEstimate}/10</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>

        {/* Disclaimer */}
        <div className="text-center mt-4 px-6">
            <p className="text-[10px] text-white/20 leading-relaxed">
                Protocolos científicos baseados em análise craniofacial.
                <br/>Consulte um especialista para orientação médica.
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
                        layoutId={expandedTrend}
                        className="fixed inset-x-4 top-[10%] bottom-8 bg-[#12121A] border border-white/10 rounded-[32px] z-50 overflow-hidden flex flex-col shadow-2xl"
                    >
                        {(() => {
                            const trend = plan.trends.find(t => t.id === expandedTrend);
                            if (!trend) return null;
                            const Icon = getProtocolIcon(trend.category, trend.id);

                            return (
                                <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
                                    {/* Header */}
                                    <div className="p-6 pb-4 border-b border-white/5 sticky top-0 bg-[#12121A]/95 backdrop-blur z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                                                <Icon className="h-6 w-6 text-[#3B82F6]" />
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
                                                <BookOpen className="h-3 w-3 text-[#3B82F6]" /> A Ciência
                                            </h4>
                                            <p className="text-white/80 text-sm leading-relaxed">
                                                {trend.science}
                                            </p>
                                        </div>

                                        {/* Steps */}
                                        <div>
                                            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-[#3B82F6]" /> Passo a Passo
                                            </h4>
                                            <div className="space-y-4">
                                                {trend.steps.map((step, idx) => (
                                                    <div key={idx} className="flex gap-4">
                                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-xs font-bold text-[#3B82F6]">
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

        <PaywallDialog />
      </div>
    </div>
  );
}
