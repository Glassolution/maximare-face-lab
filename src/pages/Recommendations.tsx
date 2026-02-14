import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mockRecommendations } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Droplets, Scissors, Dumbbell, PersonStanding, Shirt, Zap } from "lucide-react";

const tabs = ["todas", "skincare", "cabelo", "fitness", "postura", "estilo"] as const;
const tabLabels: Record<string, string> = { todas: "Todas", skincare: "Skincare", cabelo: "Cabelo", fitness: "Fitness", postura: "Postura", estilo: "Estilo" };
const catIcons: Record<string, React.ElementType> = { skincare: Droplets, cabelo: Scissors, fitness: Dumbbell, postura: PersonStanding, estilo: Shirt };
const impactColors: Record<string, string> = { alto: "bg-primary/15 text-primary", medio: "bg-warning/15 text-warning", baixo: "bg-muted text-muted-foreground" };
const impactLabels: Record<string, string> = { alto: "Alto impacto", medio: "Médio impacto", baixo: "Baixo impacto" };

export default function Recommendations() {
  const [activeTab, setActiveTab] = useState<string>("todas");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = activeTab === "todas" ? mockRecommendations : mockRecommendations.filter((r) => r.category === activeTab);

  return (
    <div className="min-h-screen pt-6 pb-28 px-4">
      <div className="container max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="font-heading text-xl font-bold text-foreground">Plano de Evolução</h1>
          </div>
          <p className="text-sm text-muted-foreground">Recomendações personalizadas para maximizar seu potencial.</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === t ? "bg-primary text-primary-foreground glow-sm" : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-2.5">
          {filtered.map((rec, i) => {
            const Icon = catIcons[rec.category] || Droplets;
            const isOpen = expanded === rec.id;
            return (
              <motion.div key={rec.id} layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl glass overflow-hidden"
              >
                <button className="w-full p-4 flex items-start gap-3 text-left" onClick={() => setExpanded(isOpen ? null : rec.id)}>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{rec.title}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${impactColors[rec.impact]}`}>
                        {impactLabels[rec.impact]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-border/20 pt-4">
                        <p className="text-sm text-muted-foreground mb-3">{rec.details}</p>
                        <div className="rounded-xl bg-muted/30 p-3 mb-3">
                          <h4 className="text-xs font-semibold text-foreground mb-2">Passos práticos</h4>
                          <ol className="space-y-1.5">
                            {rec.steps.map((s, j) => (
                              <li key={j} className="text-xs text-muted-foreground flex gap-2">
                                <span className="text-primary font-bold">{j + 1}.</span> {s}
                              </li>
                            ))}
                          </ol>
                        </div>
                        {rec.suggestions && (
                          <div className="flex flex-wrap gap-1.5">
                            {rec.suggestions.map((s) => (
                              <Badge key={s} variant="secondary" className="text-[10px] rounded-lg glass border-0">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
