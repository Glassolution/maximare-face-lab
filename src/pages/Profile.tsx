import { motion } from "framer-motion";
import { Crown, ChevronRight, Settings, Shield, Zap, Star, Award, TrendingUp, Info, Search } from "lucide-react";
import { getAnalysisHistory } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { getTier, getNextTier, ExtendedAnalysisResult } from "@/lib/rankingSystem";

const badges = [
  { label: "Primeira Análise", icon: Star, earned: true },
  { label: "Streak 7 dias", icon: Zap, earned: false },
  { label: "Score 7+", icon: TrendingUp, earned: false },
  { label: "Nível Elite", icon: Crown, earned: false },
];

export default function Profile() {
  const history = getAnalysisHistory();
  const lastAnalysis = history.length > 0 ? history[0] as unknown as ExtendedAnalysisResult : null;
  
  // Calculate stats
  const ger = lastAnalysis?.ger || 0;
  const currentTier = getTier(ger);
  const totalAnalyses = history.length;
  
  // Determine strongest/weakest for copy
  let strongest = "geral";
  let weakest = "geral";
  
  if (lastAnalysis && lastAnalysis.categories) {
      const sorted = [...lastAnalysis.categories].sort((a, b) => b.score - a.score);
      if (sorted.length > 0) strongest = sorted[0].name.toLowerCase();
      if (sorted.length > 1) weakest = sorted[sorted.length - 1].name.toLowerCase();
  }

  const nextTier = getNextTier(ger);
  const nextTierName = nextTier ? nextTier.name : "max";
  const nextTierMin = nextTier ? nextTier.min : 100;
                      
  const pointsNeeded = Math.max(0, nextTierMin - ger);

  const menuItems = [
    { label: "Plano Pro", icon: Crown, desc: "Desbloqueie tudo", path: "#" },
    { label: "Progresso", icon: TrendingUp, desc: "Seu histórico", path: "/progress" },
    { label: "Configurações", icon: Settings, desc: "Preferências", path: "#" },
    { label: "Privacidade", icon: Shield, desc: "Seus dados", path: "#" },
  ];

  return (
    <div className="min-h-screen pt-6 pb-28 px-4">
      <div className="container max-w-lg mx-auto space-y-6">

        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center pt-4"
        >
          <div className="h-20 w-20 rounded-full glass-strong flex items-center justify-center mb-3 glow-sm overflow-hidden">
             {lastAnalysis?.photoUrl ? (
                 <img src={lastAnalysis.photoUrl} alt="User" className="w-full h-full object-cover" />
             ) : (
                 <span className="font-heading text-2xl font-bold text-gradient">M</span>
             )}
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">Usuário MAXIMARE</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalAnalyses} análise{totalAnalyses !== 1 ? "s" : ""} realizada{totalAnalyses !== 1 ? "s" : ""}</p>
        </motion.div>

        {/* FIFA Analysis Block */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card border border-primary/20 rounded-2xl p-5 shadow-lg relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <Crown className="w-24 h-24" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{currentTier.badge}</span>
                    <h2 className="font-heading text-lg font-bold">Análise Estratégica</h2>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
                Sua <strong>Aura atual é {ger}</strong> ({currentTier.name.toUpperCase()}). 
                Seu visual tem pontos fortes em <strong>{strongest}</strong>. 
                Para virar <strong>{nextTierName.toUpperCase()} ({nextTierMin}+)</strong>, 
                foque em melhorar <strong>{weakest}</strong>.
            </p>
                
                {pointsNeeded > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary">
                        <TrendingUp className="h-4 w-4" />
                        Faltam +{pointsNeeded} pontos para subir de nível.
                    </div>
                )}
            </div>
        </motion.div>

        {/* Rank Card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl glass-strong p-5 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Tier Atual</p>
              <p className="font-heading text-2xl font-bold text-gradient uppercase">{currentTier.name}</p>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl font-bold text-foreground">{ger}</p>
              <p className="text-[10px] text-muted-foreground">Aura</p>
            </div>
          </div>

          {/* Rank progress */}
          <div className="relative z-10 mt-4">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Sub 3</span>
              <span>Chad</span>
              <span>True Adam</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${ger}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="font-heading text-sm font-bold text-foreground mb-3">Medalhas</h3>
          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <div key={badge.label} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl glass ${!badge.earned ? "opacity-30" : ""}`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${badge.earned ? "bg-primary/15" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${badge.earned ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight">{badge.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Look Alike Feature */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <Link to="/look-alike" className="block relative rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-5 border border-indigo-500/20 overflow-hidden cursor-pointer hover:border-indigo-500/40 transition-colors group">
             <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="flex items-center gap-4 relative z-10">
                <div className="h-12 w-12 rounded-full bg-background/50 flex items-center justify-center border border-indigo-500/20">
                   <Search className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                   <h3 className="font-heading font-bold text-lg text-foreground">Quem é seu sósia?</h3>
                   <p className="text-xs text-muted-foreground">Descubra com qual famoso você se parece.</p>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground group-hover:text-indigo-400 transition-colors" />
             </div>
          </Link>
        </motion.div>

        {/* Menu */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="space-y-2">
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              const Wrapper = item.path.startsWith("/") ? Link : "div";
              return (
                <Wrapper key={item.label} to={item.path as string}
                  className="flex items-center gap-3 rounded-2xl glass p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Wrapper>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
