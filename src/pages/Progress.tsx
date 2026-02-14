import { motion } from "framer-motion";
import { getAnalysisHistory } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, ArrowUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProgressPage() {
  const history = getAnalysisHistory();

  const chartData = [...history].reverse().map((a) => ({
    date: format(new Date(a.date), "dd/MM", { locale: ptBR }),
    score: a.overallScore,
  }));

  const delta = history.length > 1 ? +(history[0].overallScore - history[history.length - 1].overallScore).toFixed(1) : 0;

  return (
    <div className="min-h-screen pt-6 pb-28 px-4">
      <div className="container max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-heading text-xl font-bold text-foreground mb-1">Seu Progresso</h1>
          <p className="text-sm text-muted-foreground">Evolução contínua é o que separa você do topo.</p>
        </motion.div>

        {history.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground mb-1">Nenhuma análise ainda.</p>
            <p className="text-sm text-muted-foreground/60 mb-4">Seu potencial está esperando.</p>
            <Link to="/analysis"><Button className="rounded-2xl glow-sm">Começar agora</Button></Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats row */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-3 gap-2.5"
            >
              <div className="rounded-2xl glass p-4 text-center">
                <p className="font-heading text-xl font-bold text-foreground">{history[0].overallScore}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Score Atual</p>
              </div>
              <div className="rounded-2xl glass p-4 text-center">
                <p className="font-heading text-xl font-bold text-foreground">{history.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Análises</p>
              </div>
              <div className="rounded-2xl glass p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className={`font-heading text-xl font-bold ${delta >= 0 ? "text-success" : "text-destructive"}`}>
                    {delta > 0 ? "+" : ""}{delta}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Evolução</p>
              </div>
            </motion.div>

            {/* Chart */}
            {chartData.length > 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="rounded-3xl glass-strong p-5"
              >
                <h2 className="font-heading text-sm font-bold text-foreground mb-4">Evolução do Score</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(220 25% 12% / 0.9)",
                        border: "1px solid hsl(220 15% 20% / 0.5)",
                        borderRadius: 12,
                        fontSize: 12,
                        backdropFilter: "blur(10px)",
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(217 91% 60%)" strokeWidth={2.5}
                      dot={{ fill: "hsl(217 91% 60%)", r: 4, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Timeline */}
            <div className="space-y-2.5">
              <h3 className="font-heading text-sm font-bold text-foreground">Histórico</h3>
              {history.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }}>
                  <Link to={`/results/${a.id}`}
                    className="flex items-center gap-4 rounded-2xl glass p-4 hover:bg-muted/30 transition-colors"
                  >
                    {a.photoUrl ? (
                      <img src={a.photoUrl} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-muted shrink-0 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Score: <span className="text-primary font-bold">{a.overallScore}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.date), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
