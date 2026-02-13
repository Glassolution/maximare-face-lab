import { motion } from "framer-motion";
import { getAnalysisHistory } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProgressPage() {
  const history = getAnalysisHistory();

  const chartData = [...history].reverse().map((a) => ({
    date: format(new Date(a.date), "dd/MM", { locale: ptBR }),
    score: a.overallScore,
  }));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Seu Progresso</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a evolução do seu score ao longo do tempo.</p>
        </motion.div>

        {history.length === 0 ? (
          <div className="text-center py-20">
            <TrendingUp className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma análise registrada ainda.</p>
            <Link to="/analysis"><Button className="rounded-xl">Fazer primeira análise</Button></Link>
          </div>
        ) : (
          <>
            {/* Chart */}
            {chartData.length > 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border/50 bg-card p-4 mb-8">
                <h2 className="font-heading text-sm font-bold text-foreground mb-4">Evolução do Score</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Timeline */}
            <div className="space-y-3">
              {history.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/results/${a.id}`} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 hover:border-primary/30 transition-colors">
                    {a.photoUrl ? (
                      <img src={a.photoUrl} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-muted shrink-0 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Score: <span className="text-primary font-bold">{a.overallScore}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.date), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
