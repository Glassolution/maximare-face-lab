import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mockRecommendations, type Recommendation } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Droplets, Scissors, Dumbbell, PersonStanding, Shirt } from "lucide-react";

const tabs = ["todas", "skincare", "cabelo", "fitness", "postura", "estilo"] as const;
const tabLabels: Record<string, string> = { todas: "Todas", skincare: "Skincare", cabelo: "Cabelo", fitness: "Fitness", postura: "Postura", estilo: "Estilo" };
const catIcons: Record<string, React.ElementType> = { skincare: Droplets, cabelo: Scissors, fitness: Dumbbell, postura: PersonStanding, estilo: Shirt };
const impactColors: Record<string, string> = { alto: "bg-primary/20 text-primary", medio: "bg-warning/20 text-warning", baixo: "bg-muted text-muted-foreground" };
const impactLabels: Record<string, string> = { alto: "Alto impacto", medio: "Médio impacto", baixo: "Baixo impacto" };

export default function Recommendations() {
  const [activeTab, setActiveTab] = useState<string>("todas");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = activeTab === "todas" ? mockRecommendations : mockRecommendations.filter((r) => r.category === activeTab);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Seu Plano de Melhoria</h1>
          <p className="text-sm text-muted-foreground">Recomendações personalizadas baseadas na sua análise.</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {filtered.map((rec) => {
            const Icon = catIcons[rec.category] || Droplets;
            const isOpen = expanded === rec.id;
            return (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/50 bg-card overflow-hidden"
              >
                <button className="w-full p-4 flex items-start gap-4 text-left" onClick={() => setExpanded(isOpen ? null : rec.id)}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
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
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-border/30 pt-4">
                        <p className="text-sm text-muted-foreground mb-3">{rec.details}</p>
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Passos práticos</h4>
                        <ol className="space-y-1.5 mb-3">
                          {rec.steps.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span className="text-primary font-bold">{i + 1}.</span> {s}
                            </li>
                          ))}
                        </ol>
                        {rec.suggestions && (
                          <>
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Sugestões</h4>
                            <div className="flex flex-wrap gap-2">
                              {rec.suggestions.map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs rounded-lg">{s}</Badge>
                              ))}
                            </div>
                          </>
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
