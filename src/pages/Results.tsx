import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getAnalysisHistory } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Scan, Diamond, Sparkles, Droplets, Scissors, Eye, ArrowRight, Lock, Crown, ChevronRight, Share2, Info } from "lucide-react";
import { useState } from "react";
import PaywallModal from "@/components/PaywallModal";
import { ExtendedAnalysisResult } from "@/lib/rankingSystem";

const iconMap: Record<string, React.ElementType> = { Scan, Diamond, Sparkles, Droplets, Scissors, Eye };

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const history = getAnalysisHistory();
  const result = history.find((a) => a.id === id) as unknown as ExtendedAnalysisResult;

  // Fallback if result is old format
  const isExtended = result && 'ger' in result;
  const ger = isExtended ? result.ger : Math.round(result?.overallScore * 10) || 0;
  const tier = isExtended ? result.tier : "SUB3";
  const badge = isExtended ? result.badge : "";
  const categories = isExtended ? result.categories : (result?.categories.map(c => ({
    ...c,
    color: c.score >= 8 ? "green" : c.score >= 6 ? "yellow" : "red",
    description: "Upgrade para ver detalhes."
  })) || []);

  if (!result) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Análise não encontrada.</p>
        <Link to="/analysis"><Button>Nova análise</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 bg-background">
      <div className="container max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
            <h1 className="font-heading text-xl font-bold">Seu Relatório</h1>
            <Button variant="ghost" size="icon" className="rounded-full">
                <Share2 className="h-5 w-5" />
            </Button>
        </div>

        {/* FIFA Card Style */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="relative rounded-[2rem] overflow-hidden bg-card border border-border/50 shadow-2xl"
        >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
            
            <div className="relative p-6 flex flex-col items-center text-center">
                {/* Badge & Tier */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{badge}</span>
                    <span className="font-heading font-bold text-xl uppercase tracking-wider text-foreground">{tier}</span>
                </div>

                {/* Photo & GER */}
                <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-primary to-accent">
                        <div className="w-full h-full rounded-full overflow-hidden bg-muted relative">
                            {result.photoUrl ? (
                                <img src={result.photoUrl} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <Scan className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background border border-border/50 px-4 py-1 rounded-full shadow-lg flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Aura</span>
                        <span className="font-heading text-2xl font-black text-foreground">{ger}</span>
                    </div>
                </div>

                {/* Attributes Preview (Top 4) */}
                <div className="w-full grid grid-cols-2 gap-3 mt-4">
                    {categories.slice(0, 4).map((cat) => (
                        <div key={cat.id} className="bg-secondary/30 rounded-xl p-3 flex flex-col items-start gap-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">{cat.name}</span>
                            <div className="flex items-end justify-between w-full">
                                <span className={`text-xl font-bold ${
                                    cat.color === 'green' ? 'text-green-500' : 
                                    cat.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
                                }`}>
                                    {isExtended ? cat.score : Math.round(cat.score * 10)}
                                </span>
                                <div className="flex-1 ml-2 h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                                    <div 
                                        className={`h-full rounded-full ${
                                            cat.color === 'green' ? 'bg-green-500' : 
                                            cat.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`} 
                                        style={{ width: `${isExtended ? cat.score : cat.score * 10}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>

        {/* Locked Detailed Analysis */}
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h2 className="font-heading text-lg font-bold">Análise Detalhada</h2>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">PRO</span>
            </div>

            <div className="relative space-y-3">
                {/* Detailed Analysis List */}
                <div className="relative space-y-3">
                    {/* Paywall Overlay - Only covers items 5+ (index 4+) */}
                    {!showPaywall && (
                        <div className="absolute top-[320px] left-0 right-0 bottom-0 z-10 backdrop-blur-[2px] bg-background/60 flex flex-col items-center justify-start pt-10 rounded-b-2xl border-t border-border/50">
                            <Crown className="h-12 w-12 text-primary mb-3 animate-pulse" />
                            <h3 className="font-heading text-xl font-bold mb-2">Desbloquear Tudo</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-[200px] mb-6">
                                Veja seus 12 atributos detalhados e receba dicas personalizadas.
                            </p>
                            <Button onClick={() => setShowPaywall(true)} className="rounded-full px-8 py-6 text-base font-bold shadow-xl glow-primary">
                                Desbloquear Análise
                            </Button>
                            <p className="text-xs text-muted-foreground mt-4 underline cursor-pointer">Continuar como usuário gratuito</p>
                        </div>
                    )}

                    {categories.map((cat, i) => (
                        <div key={cat.id} className={`bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 ${i >= 4 && !showPaywall ? 'opacity-30 blur-sm pointer-events-none' : ''}`}>
                             <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                                cat.color === 'green' ? 'bg-green-500/10 text-green-500' : 
                                cat.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                             }`}>
                                 <span className="font-bold text-sm">{isExtended ? cat.score : Math.round(cat.score * 10)}</span>
                             </div>
                             <div className="flex-1">
                                 <div className="flex justify-between mb-1">
                                     <span className="font-medium text-sm">{cat.name}</span>
                                 </div>
                                 <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                     <div 
                                        className={`h-full rounded-full ${
                                            cat.color === 'green' ? 'bg-green-500' : 
                                            cat.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`} 
                                        style={{ width: `${isExtended ? cat.score : cat.score * 10}%` }} 
                                    />
                                 </div>
                                 <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                                     {isExtended ? (cat as any).description : "Dica bloqueada para usuários gratuitos."}
                                 </p>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onContinue={() => { setShowPaywall(false); navigate("/recommendations"); }} />
    </div>
  );
}
