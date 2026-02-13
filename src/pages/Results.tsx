import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getAnalysisHistory, mockRecommendations } from "@/lib/mockData";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Scan, Diamond, Sparkles, Droplets, Scissors, Eye, ArrowRight } from "lucide-react";
import { useState } from "react";
import PaywallModal from "@/components/PaywallModal";

const iconMap: Record<string, React.ElementType> = { Scan, Diamond, Sparkles, Droplets, Scissors, Eye };

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const history = getAnalysisHistory();
  const result = history.find((a) => a.id === id);

  if (!result) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Análise não encontrada.</p>
        <Link to="/analysis"><Button>Nova análise</Button></Link>
      </div>
    </div>
  );

  const chartData = [{ value: result.overallScore * 10, fill: "hsl(var(--primary))" }];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Score */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center mb-10">
          <div className="relative">
            <RadialBarChart width={200} height={200} innerRadius="78%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270} barSize={12}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" angleAxisId={0} cornerRadius={10} />
            </RadialBarChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-4xl font-extrabold text-foreground">{result.overallScore}</span>
              <span className="text-xs text-muted-foreground">de 10</span>
            </div>
          </div>
          <h1 className="font-heading text-xl font-bold text-foreground mt-2">Seu Score Geral</h1>
          <p className="text-sm text-muted-foreground">Baseado em 6 categorias faciais</p>
        </motion.div>

        {/* Categories */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {result.categories.map((cat) => {
            const Icon = iconMap[cat.icon] || Scan;
            return (
              <div key={cat.id} className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                    <span className="text-sm font-bold text-primary ml-2">{cat.score}</span>
                  </div>
                  <Progress value={cat.score * 10} className="h-2" />
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="rounded-xl gap-2 px-6" onClick={() => setShowPaywall(true)}>
            Ver recomendações <ArrowRight className="h-4 w-4" />
          </Button>
          <Link to="/analysis">
            <Button variant="outline" className="rounded-xl w-full sm:w-auto">Nova análise</Button>
          </Link>
        </motion.div>
      </div>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onContinue={() => { setShowPaywall(false); navigate("/recommendations"); }} />
    </div>
  );
}
