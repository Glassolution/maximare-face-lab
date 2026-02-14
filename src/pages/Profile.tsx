import { motion } from "framer-motion";
import { Crown, ChevronRight, Settings, Shield, Zap, Star, Award, TrendingUp } from "lucide-react";
import { getAnalysisHistory } from "@/lib/mockData";
import { Link } from "react-router-dom";

const ranks = [
  { name: "Iniciante", min: 0, max: 4.9 },
  { name: "Avançado", min: 5, max: 6.4 },
  { name: "Elite", min: 6.5, max: 7.9 },
  { name: "Apex", min: 8, max: 10 },
];

const badges = [
  { label: "Primeira Análise", icon: Star, earned: true },
  { label: "Streak 7 dias", icon: Zap, earned: false },
  { label: "Score 7+", icon: TrendingUp, earned: false },
  { label: "Nível Elite", icon: Crown, earned: false },
];

export default function Profile() {
  const history = getAnalysisHistory();
  const lastScore = history.length > 0 ? history[0].overallScore : 0;
  const totalAnalyses = history.length;
  const currentRank = ranks.find(r => lastScore >= r.min && lastScore <= r.max) || ranks[0];

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
          <div className="h-20 w-20 rounded-full glass-strong flex items-center justify-center mb-3 glow-sm">
            <span className="font-heading text-2xl font-bold text-gradient">M</span>
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground">Usuário MAXIMARE</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalAnalyses} análise{totalAnalyses !== 1 ? "s" : ""} realizada{totalAnalyses !== 1 ? "s" : ""}</p>
        </motion.div>

        {/* Rank Card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-3xl glass-strong p-5 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Rank Atual</p>
              <p className="font-heading text-2xl font-bold text-gradient">{currentRank.name.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl font-bold text-foreground">{lastScore || "—"}</p>
              <p className="text-[10px] text-muted-foreground">Visual Score</p>
            </div>
          </div>

          {/* Rank progress */}
          <div className="relative z-10 mt-4">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              {ranks.map(r => <span key={r.name}>{r.name}</span>)}
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((lastScore / 10) * 100, 100)}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="font-heading text-sm font-bold text-foreground mb-3">Medalhas</h3>
          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <motion.div key={badge.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12 + i * 0.04 }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl glass ${!badge.earned ? "opacity-30" : ""}`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${badge.earned ? "bg-primary/15" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${badge.earned ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight">{badge.label}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Menu */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
