import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { ArrowLeft, Share2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGerHistory, GerResult, GerAttribute, TIER_LABELS, getScoreColor } from "@/lib/gerTypes";
import PaywallModal from "@/components/PaywallModal";

const FREE_ATTRIBUTES_COUNT = 4;
const ATTRS_PER_PAGE = 6;

function ScoreBar({ score, delay = 0 }: { score: number; delay?: number }) {
  const color = getScoreColor(score);
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden mt-1.5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, delay }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function AttributeCard({ attr, index, locked }: { attr: GerAttribute; index: number; locked: boolean }) {
  return (
    <div className={`relative rounded-2xl p-4 ${locked ? "glass opacity-50" : "glass"}`}>
      {locked && (
        <div className="absolute inset-0 rounded-2xl backdrop-blur-md bg-background/40 flex items-center justify-center z-10">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{attr.name}</span>
        <span className="text-2xl font-heading font-extrabold text-foreground">{locked ? "??" : attr.score}</span>
      </div>
      <ScoreBar score={locked ? 0 : attr.score} delay={0.1 + index * 0.05} />
    </div>
  );
}

export default function GerResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showPaywall, setShowPaywall] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPro] = useState(false);

  const history = getGerHistory();
  const result = history.find((r) => r.id === id);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Análise não encontrada.</p>
          <Link to="/analysis"><Button>Nova análise</Button></Link>
        </div>
      </div>
    );
  }

  const tier = TIER_LABELS[result.tier] || { label: result.tier.toUpperCase(), emoji: "⭐" };
  const totalPages = Math.ceil(result.attributes.length / ATTRS_PER_PAGE);
  const paginatedAttrs = result.attributes.slice(
    currentPage * ATTRS_PER_PAGE,
    (currentPage + 1) * ATTRS_PER_PAGE
  );

  return (
    <div className="min-h-screen pb-32 bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="h-10 w-10 rounded-full glass flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="font-heading text-base font-bold text-foreground">Obtenha Sua Análise</h1>
        <button className="h-10 w-10 rounded-full glass flex items-center justify-center">
          <Share2 className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Hero section with photo + score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6"
      >
        <div className="flex items-center gap-5">
          {result.frontalPhoto && (
            <img
              src={result.frontalPhoto}
              alt="Seu rosto"
              className="w-28 h-28 rounded-2xl object-cover border-2 border-border/30"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-heading text-sm font-bold text-foreground tracking-wider">
                {tier.label}
              </span>
              <span>{tier.emoji}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-lg text-muted-foreground font-medium">Pontuação</span>
              <span className="font-heading text-4xl font-extrabold text-primary">
                {result.secondaryScore}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aura {result.ger} • {result.isPartial ? "Análise Parcial" : "Análise Completa"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tier info */}
      {result.nextTier && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="px-4 mb-4"
        >
          <div className="rounded-2xl glass p-3 text-center">
            <p className="text-sm text-foreground">
              Você está no tier: <span className="font-bold text-primary">{tier.label}</span> (Aura {result.ger})
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Faltam <span className="font-bold text-warning">+{result.nextTier.pointsNeeded} pontos</span> para subir para{" "}
              <span className="font-bold">{TIER_LABELS[result.nextTier.name]?.label || result.nextTier.name}</span>.
            </p>
          </div>
        </motion.div>
      )}

      {/* Attribute cards grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4"
      >
        <div className="grid grid-cols-2 gap-3">
          {paginatedAttrs.map((attr, i) => {
            const globalIdx = currentPage * ATTRS_PER_PAGE + i;
            const locked = !isPro && globalIdx >= FREE_ATTRIBUTES_COUNT;
            return <AttributeCard key={attr.id} attr={attr} index={i} locked={locked} />;
          })}
        </div>

        {/* Pagination dots */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="text-muted-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentPage ? "w-4 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="text-muted-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Report section (PRO) */}
      {isPro && result.report && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-4 mt-6"
        >
          <div className="rounded-2xl glass p-4 space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground">📊 Relatório Inteligente</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.report.summary}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-success mb-1">💪 Pontos Fortes</p>
                {result.report.strongPoints.map((p) => (
                  <p key={p} className="text-xs text-muted-foreground">• {p}</p>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-destructive mb-1">⚡ A Melhorar</p>
                {result.report.weakPoints.map((p) => (
                  <p key={p} className="text-xs text-muted-foreground">• {p}</p>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="px-4 mt-8 space-y-3"
      >
        {!isPro && (
          <>
            <Button
              className="w-full rounded-2xl py-6 text-base font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => setShowPaywall(true)}
            >
              <Lock className="h-5 w-5 mr-2" />
              Desbloquear Análise Completa
            </Button>
            <button
              onClick={() => navigate("/analysis")}
              className="block w-full text-center text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
            >
              Continuar como usuário gratuito
            </button>
          </>
        )}

        {isPro && (
          <Link to="/analysis" className="block">
            <Button className="w-full rounded-2xl py-6 text-base font-semibold">
              Nova Análise
            </Button>
          </Link>
        )}
      </motion.div>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onContinue={() => {
          setShowPaywall(false);
          navigate("/analysis");
        }}
      />
    </div>
  );
}
