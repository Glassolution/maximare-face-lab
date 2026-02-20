import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getAnalysisHistory } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Scan } from "lucide-react";
import { useState } from "react";
import PaywallModal from "@/components/PaywallModal";
import { ExtendedAnalysisResult, getTier } from "@/lib/rankingSystem";

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
  const statePhoto = (location.state as { photoUrl?: string } | null)?.photoUrl;

  const pslScore = typeof result?.pslScore === "number" ? result.pslScore : Math.floor(ger / 10);
  const pslPercent = Math.max(0, Math.min(100, (pslScore / 10) * 100));
  const tierInfo = getTier(ger);
  const baseAppeal = result?.appealLevel || tierInfo.label || tierInfo.name.toUpperCase();
  const mindset =
    result?.mindset ||
    (ger < 55 ? "Em desenvolvimento" : ger < 75 ? "Equilibrada" : "Dominante");
  const strategy =
    result?.strategy ||
    (ger < 60 ? "Maximização intensa" : "Otimização refinada");
  const jawType =
    result?.jawType || result?.technicalBreakdown?.jawline || "Não avaliado";
  const breathing = result?.breathing || "Não avaliado";
  const appealLevel = baseAppeal;
  const rankLabel = baseAppeal.toUpperCase();

  if (!result) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Análise não encontrada.</p>
        <Link to="/analysis"><Button>Nova análise</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-[390px] mx-auto flex flex-col items-center">
        <div className="relative mb-8">
          <div className="w-48 h-48 rounded-full overflow-hidden border-2 border-white/10 ring-4 ring-primary/5">
            <div className="w-full h-full relative">
              {statePhoto ? (
                <img
                  src={statePhoto}
                  alt="Usuário"
                  className="w-full h-full object-cover grayscale brightness-90 contrast-110"
                />
              ) : result.photoUrl ? (
                <img
                  src={result.photoUrl}
                  alt="Usuário"
                  className="w-full h-full object-cover grayscale brightness-90 contrast-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/40">
                  <Scan className="w-12 h-12 text-white/40" />
                </div>
              )}
            </div>
          </div>
          <div className="absolute inset-0 border-[0.5px] border-primary/20 rounded-full scale-110 pointer-events-none animate-pulse" />
        </div>

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest text-primary border border-primary/40 rounded bg-primary/5 uppercase">
              {rankLabel}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Análise Estrutural
            </h1>
          </div>
          <p className="text-white/40 text-xs font-mono uppercase tracking-[0.2em]">
            Análise Maximare
          </p>
        </div>

        <div className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[24px] p-8 shadow-2xl relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 relative z-10">
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Pontuação PSL
              </p>
              <p className="text-xl font-semibold text-white">
                {pslScore.toFixed(1)}
              </p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div
                  className="h-full bg-primary shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                  style={{ width: `${pslPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Mentalidade
              </p>
              <p className="text-xl font-semibold text-white">{mindset}</p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div className="h-full bg-primary w-[88%] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Estratégia
              </p>
              <p className="text-xl font-semibold text-white">{strategy}</p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div className="h-full bg-primary w-[65%] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Tipo de mandíbula
              </p>
              <p className="text-xl font-semibold text-white">{jawType}</p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div className="h-full bg-primary w-[92%] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Respiração
              </p>
              <p className="text-xl font-semibold text-white">{breathing}</p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div className="h-full bg-primary w-[78%] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Nível de apelo
              </p>
              <p className="text-xl font-semibold text-white">{appealLevel}</p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div className="h-full bg-primary w-[95%] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/10" />
            </div>
            <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
              Dados biométricos verificados
            </span>
          </div>
        </div>

        <div className="mt-12 opacity-30 flex flex-col items-center gap-2">
          <span className="text-sm">▢▢</span>
          <p className="text-[10px] font-mono tracking-tighter">
            MAXIMARE-IA-0X92-2024
          </p>
        </div>
      </div>

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

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onContinue={() => { setShowPaywall(false); navigate("/recommendations"); }} />
    </div>
  );
}
