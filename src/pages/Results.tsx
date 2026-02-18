import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getAnalysisHistory } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Scan, Share2 } from "lucide-react";
import { useState } from "react";
import PaywallModal from "@/components/PaywallModal";
import { ExtendedAnalysisResult } from "@/lib/rankingSystem";

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPaywall, setShowPaywall] = useState(false);
  const history = getAnalysisHistory();
  const result = history.find((a) => a.id === id) as ExtendedAnalysisResult | undefined;

  // Fallback if result is old format
  const isExtended = !!result && "ger" in result;
  const ger = isExtended ? result.ger : Math.round((result?.overallScore || 0) * 10) || 0;
  const tier = isExtended ? result.tier : "SUB3";
  const badge = isExtended ? result.badge || "" : "";
  const categories = result?.categories;
  const statePhoto = (location.state as { photoUrl?: string } | null)?.photoUrl;

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
                    {statePhoto ? (
                      <img src={statePhoto} alt="User" className="w-full h-full object-cover" />
                    ) : result.photoUrl ? (
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

            </div>
        </motion.div>

        {categories && categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl glass-strong p-4"
          >
            <h3 className="text-sm font-bold text-foreground mb-3">Seus pilares faciais</h3>
            <div className="space-y-3">
              {categories.map((cat) => {
                const rawScore = typeof cat.score === "number" ? cat.score : parseFloat(String(cat.score));
                const safeScore = Number.isFinite(rawScore) ? rawScore : 0;
                const percent =
                  safeScore <= 10 ? Math.max(0, Math.min(100, safeScore * 10)) : Math.max(0, Math.min(100, safeScore));
                const displayScore =
                  safeScore <= 10 ? Number(safeScore.toFixed(1)) : Math.round(safeScore);

                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{cat.name}</span>
                        <span className="font-semibold text-muted-foreground">{displayScore}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full bg-primary"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Music Card */}
        {result.song_match && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass-strong p-4">
            <h3 className="text-sm font-bold text-foreground mb-2">Sua música</h3>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{result.song_match.track_name}</p>
                <p className="text-xs text-muted-foreground">{result.song_match.artist}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{result.song_match.reason}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <a href={result.song_match.spotify_url} target="_blank" rel="noreferrer">
                  <Button size="sm" className="rounded-xl">Ouvir no Spotify</Button>
                </a>
                {result.song_match.preview_url && (
                  <audio controls src={result.song_match.preview_url} className="h-8" />
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Technical Diagnosis - Removed per user request */}

        {/* Detailed Analysis - Removed per user request */}
      </div>

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onContinue={() => { setShowPaywall(false); navigate("/recommendations"); }} />
    </div>
  );
}
