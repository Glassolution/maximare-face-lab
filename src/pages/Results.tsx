import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getAnalysisHistory } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Scan, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { usePaywallGate } from "@/hooks/usePaywallGate";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { PaywallDialog } from "@/components/paywall/PaywallDialog";
import { ExtendedAnalysisResult, getTier, getMindset, getStrategy } from "@/lib/rankingSystem";
import { getScoreColor } from "@/lib/gerTypes";
import { useAuth } from "@/hooks/useAuth";
import { avatarService } from "@/services/avatarService";

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { checkGate, isPaywallOpen, closePaywall } = usePaywallGate();
  const { isPremium } = usePremiumStatus();
  const { user, profile } = useAuth();
  
  // Soft gate on view
  useEffect(() => {
    if (isPremium) return;
    checkGate({ trigger: 'report_view' });
  }, [checkGate, isPremium]);

  const history = getAnalysisHistory();
  const result = history.find((a) => a.id === id) as ExtendedAnalysisResult | undefined;

  if (!result) return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Análise não encontrada.</p>
        <Link to="/analysis"><Button>Nova análise</Button></Link>
      </div>
    </div>
  );

  // Fallback if result is old format
  const isExtended = !!result && "ger" in result;
  const ger = isExtended ? result.ger : Math.round((result?.overallScore || 0) * 10) || 0;
  const tier = isExtended ? result.tier : "SUB3";
  const badge = isExtended ? result.badge || "" : "";
  const statePhoto = (location.state as { photoUrl?: string } | null)?.photoUrl;
  const isShareMode = new URLSearchParams(location.search).get('share') === '1';

  // Force recalculation based on GER to ensure consistency across the app
  const tierInfo = getTier(ger);
  
  // Calculate PSL from GER to avoid inconsistencies
  const pslScore = ger / 10;
  const pslPercent = Math.max(0, Math.min(100, ger)); // GER is 0-99, so it maps directly to %
  
  const classificationColor = getScoreColor(ger);
  const pslColor = getScoreColor(pslPercent);

  const baseAppeal = tierInfo.label || tierInfo.name.toUpperCase();
  const mindset = getMindset(ger);
  const strategy = getStrategy(ger);

  const jawType =
    result?.jawType || result?.technicalBreakdown?.jawline || "Não avaliado";
  const breathing = result?.breathing || "Não avaliado";
  const harmony = result?.technicalBreakdown?.fwhr || "Não avaliado";
  const symmetry = result?.technicalBreakdown?.asymmetry || "Não avaliado";

  const harmonyCat = result?.categories?.find(c => c.id === "harmony");
  const symmetryCat = result?.categories?.find(c => c.id === "symmetry");
  const breathingCat = result?.categories?.find(c => c.id === "breathing");

  const harmonyPercent = harmonyCat ? harmonyCat.score : 85;
  const symmetryPercent = symmetryCat ? symmetryCat.score : 82;
  const breathingPercent = breathingCat ? breathingCat.score : 78;

  const harmonyColor = harmonyCat ? getScoreColor(harmonyCat.score) : classificationColor;
  const symmetryColor = symmetryCat ? getScoreColor(symmetryCat.score) : classificationColor;
  const breathingColor = breathingCat ? getScoreColor(breathingCat.score) : classificationColor;

  const appealLevel = baseAppeal;
  const rankLabel = baseAppeal.toUpperCase();
  
  const mindsetPercent = mindset === "Ascensionado" ? 100 : mindset === "Focado" ? 66 : 33;

  const displayName =
    profile?.display_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Usuário";

  const avatarUrl = avatarService.getAvatarPublicUrl(profile?.avatar_url);

  const handleEnterShareMode = () => {
    navigate(`/results/${id}?share=1`);
  };

  const handleExitShareMode = () => {
    navigate(`/results/${id}`);
  };

  const handleShare = async () => {
    try {
      if (!('share' in navigator)) {
        return;
      }
      await navigator.share({
        title: 'Minha Análise Maximare',
        text: `Minha análise Maximare: ${rankLabel} • PSL ${pslScore.toFixed(1)}`,
        url: window.location.href,
      });
    } catch {
      return;
    }
  };

  if (isShareMode) {
    const shareItems = [
      { label: 'Pontuação PSL', value: pslScore.toFixed(1), color: pslColor, width: `${pslPercent}%` },
      { label: 'Mentalidade', value: mindset, color: classificationColor, width: `${mindsetPercent}%` },
      { label: 'Estratégia', value: strategy, color: classificationColor, width: "65%" },
      { label: 'Tipo de mandíbula', value: jawType, color: classificationColor, width: "92%" },
      { label: 'Respiração', value: breathing, color: breathingColor, width: `${breathingPercent}%` },
      { label: 'Nível de apelo', value: appealLevel, color: classificationColor, width: "95%" },
    ];

    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center px-5 py-6">
        <div className="w-full max-w-[390px] flex flex-col items-center">
          <div className="w-full flex flex-col items-center">
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 border-white/10 ring-4 ring-primary/5 mb-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : statePhoto || result.photoUrl ? (
                <img src={statePhoto || result.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/40">
                  <Scan className="w-10 h-10 text-white/40" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest text-primary border border-primary/40 rounded bg-primary/5 uppercase">
                {rankLabel}
              </span>
              <h1 className="text-lg font-bold tracking-tight text-white truncate max-w-[240px]">
                {displayName}
              </h1>
            </div>

            <p className="mt-1 text-white/40 text-[10px] font-mono uppercase tracking-[0.22em] text-center">
              ANÁLISE MAXIMARE
            </p>

            <div className="w-full mt-5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 relative z-10">
                {shareItems.map((item) => (
                  <div key={item.label} className="space-y-3 min-w-0">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider truncate">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-white truncate">
                      {item.value}
                    </p>
                    <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: item.width, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
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

            <p className="mt-4 text-white/35 text-[10px] font-mono tracking-wider">maximare.app</p>
          </div>

          <div className="w-full mt-4 flex flex-col gap-2">
            <Button className="w-full rounded-2xl" onClick={handleShare}>
              Compartilhar
            </Button>
            <Button variant="outline" className="w-full rounded-2xl" onClick={handleExitShareMode}>
              Voltar
            </Button>
          </div>

          <PaywallDialog isOpen={isPaywallOpen} onClose={closePaywall} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white px-4 pt-6 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[390px] mx-auto flex flex-col items-center">
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 ring-4 ring-primary/5">
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

        <div className="text-center mb-6">
          <div className="inline-block">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest text-primary border border-primary/40 rounded bg-primary/5 uppercase">
                {rankLabel}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Análise Estrutural
              </h1>
            </div>
            <p className="text-white/40 text-xs font-mono uppercase tracking-[0.2em] text-center">
              Análise Maximare
            </p>
          </div>
        </div>

        <div className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="grid grid-cols-2 gap-x-8 gap-y-6 relative z-10">
            {/* PSL - Visible */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Pontuação PSL
              </p>
              <p className="text-lg font-semibold text-white">
                {pslScore.toFixed(1)}
              </p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pslPercent}%`, backgroundColor: pslColor }}
                />
              </div>
            </div>

            {/* Mindset - Visible */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Mentalidade
              </p>
              <p className="text-lg font-semibold text-white">{mindset}</p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${mindsetPercent}%`, backgroundColor: classificationColor }}
                />
              </div>
            </div>

            {/* Strategy - Locked */}
            <div 
              className="space-y-3 relative cursor-pointer"
              onClick={() => !isPremium && checkGate({ trigger: 'feature_locked' })}
            >
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Estratégia
              </p>
              <div className={!isPremium ? "blur-sm opacity-50" : ""}>
                <p className="text-lg font-semibold text-white">{strategy}</p>
                <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: "65%", backgroundColor: classificationColor }}
                  />
                </div>
              </div>
              {!isPremium && (
                <div className="absolute inset-0 flex items-center justify-center pt-4">
                  <Lock className="w-4 h-4 text-white/70" />
                </div>
              )}
            </div>

            {/* Jaw - Locked */}
            <div 
              className="space-y-3 relative cursor-pointer"
              onClick={() => !isPremium && checkGate({ trigger: 'feature_locked' })}
            >
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Tipo de mandíbula
              </p>
              <div className={!isPremium ? "blur-sm opacity-50" : ""}>
                <p className="text-lg font-semibold text-white">{jawType}</p>
                <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: "92%", backgroundColor: classificationColor }}
                  />
                </div>
              </div>
              {!isPremium && (
                <div className="absolute inset-0 flex items-center justify-center pt-4">
                  <Lock className="w-4 h-4 text-white/70" />
                </div>
              )}
            </div>

            {/* Breathing - Locked */}
            <div 
              className="space-y-3 relative cursor-pointer"
              onClick={() => !isPremium && checkGate({ trigger: 'feature_locked' })}
            >
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Respiração
              </p>
              <div className={!isPremium ? "blur-sm opacity-50" : ""}>
                <p className="text-lg font-semibold text-white">{breathing}</p>
                <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${breathingPercent}%`, backgroundColor: breathingColor }}
                  />
                </div>
              </div>
              {!isPremium && (
                <div className="absolute inset-0 flex items-center justify-center pt-4">
                  <Lock className="w-4 h-4 text-white/70" />
                </div>
              )}
            </div>

            {/* Harmony - Locked */}
            <div 
              className="space-y-3 relative cursor-pointer"
              onClick={() => !isPremium && checkGate({ trigger: 'feature_locked' })}
            >
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Harmonia
              </p>
              <div className={!isPremium ? "blur-sm opacity-50" : ""}>
                <p className="text-xl font-semibold text-white">{harmony}</p>
                <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${harmonyPercent}%`, backgroundColor: harmonyColor }}
                  />
                </div>
              </div>
              {!isPremium && (
                <div className="absolute inset-0 flex items-center justify-center pt-4">
                  <Lock className="w-4 h-4 text-white/70" />
                </div>
              )}
            </div>

            {/* Symmetry - Locked */}
            <div 
              className="space-y-3 relative cursor-pointer"
              onClick={() => !isPremium && checkGate({ trigger: 'feature_locked' })}
            >
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Simetria
              </p>
              <div className={!isPremium ? "blur-sm opacity-50" : ""}>
                <p className="text-lg font-semibold text-white">{symmetry}</p>
                <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${symmetryPercent}%`, backgroundColor: symmetryColor }}
                  />
                </div>
              </div>
              {!isPremium && (
                <div className="absolute inset-0 flex items-center justify-center pt-4">
                  <Lock className="w-4 h-4 text-white/70" />
                </div>
              )}
            </div>

            {/* Appeal - Visible */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Nível de apelo
              </p>
              <p className="text-lg font-semibold text-white">{appealLevel}</p>
              <div className="w-full bg-white/10 rounded-full overflow-hidden h-[2px]">
                <div
                  className="h-full rounded-full"
                  style={{ width: "95%", backgroundColor: classificationColor }}
                />
              </div>
            </div>
          </div>



          <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center relative z-10">
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

        <div className="mt-8 opacity-30 flex flex-col items-center gap-2">
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

        {/* Button removed per user request */}

        <div className="w-full mt-6">
          <Button className="w-full rounded-2xl" onClick={handleEnterShareMode}>
            Compartilhar resultado
          </Button>
        </div>

      <PaywallDialog isOpen={isPaywallOpen} onClose={closePaywall} />
    </div>
  );
}
