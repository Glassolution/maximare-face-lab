import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, ChevronRight, Settings, Shield, Zap, Star, TrendingUp, Search, LogOut, Moon, Sun, Copy, Camera, LayoutDashboard, Sparkles } from "lucide-react";
import { getAnalysisHistory } from "@/lib/mockData";
import { toast } from "sonner";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getTier, getNextTier, ExtendedAnalysisResult } from "@/lib/rankingSystem";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getValidAccessToken } from "@/lib/session";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/theme/ThemeProvider";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { avatarService } from "@/services/avatarService";

type MenuItem = {
  label: string;
  icon: typeof Crown;
  desc: string;
  path: string;
  onClick?: () => void;
};

// Design tokens
const COLORS = {
  bg: "#0D0D14",
  card: "#13131F",
  blue: "#4F6EF7",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.5)",
  textTertiary: "rgba(255,255,255,0.3)",
  border: "rgba(255,255,255,0.06)",
};

export default function Profile() {
  const { user, profile, refreshSession, signOut } = useAuth();
  const { isPremium, subscriptionStatus, expiresAt, planType } = usePremiumStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const history = getAnalysisHistory();
  const lastAnalysis = history.length > 0 ? (history[0] as unknown as ExtendedAnalysisResult) : null;
  const { theme, setTheme } = useTheme();
  const [showPreferences, setShowPreferences] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);

  const [shortId, setShortId] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) refreshSession(true);
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.public_id) setShortId(profile.public_id.toString());
      else if (profile.short_id) setShortId(profile.short_id);
      if (profile.username) setProfileUsername(profile.username);
      if (profile.avatar_url) {
        setAvatarUrl(avatarService.getAvatarPublicUrl(profile.avatar_url));
      } else if ((lastAnalysis as any)?.image_url) {
        setAvatarUrl((lastAnalysis as any).image_url);
      }
    }
  }, [profile, lastAnalysis]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setUploadingAvatar(true);
    try {
      const { publicUrl } = await avatarService.uploadAvatar(file);
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success("Foto de perfil atualizada!");
    } catch {
      toast.error("Erro ao atualizar foto de perfil.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (location.state?.premiumActivated) {
      toast.success("Assinatura Premium ativada com sucesso!");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        if (!shortId) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("short_id, public_id, username")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profileData) {
            if (profileData.public_id) setShortId(profileData.public_id.toString());
            else if (profileData.short_id) setShortId(profileData.short_id);
            if (profileData.username) setProfileUsername(profileData.username);
          }
        }
        const { data: currentBadges } = await supabase
          .from("user_badges")
          .select("badge_id")
          .eq("user_id", user.id);
        if (currentBadges) setEarnedBadges(currentBadges.map((b) => b.badge_id));

        const token = await getValidAccessToken();
        if (token) {
          const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
          const { data, error } = await supabase.functions.invoke("check-achievements", {
            headers: { Authorization: `Bearer ${token}`, apikey: anon, "sb-access-token": token, "x-supabase-auth": token },
          });
          if (!error && data?.badges_awarded?.length > 0) {
            const { data: updatedBadges } = await supabase
              .from("user_badges")
              .select("badge_id")
              .eq("user_id", user.id);
            if (updatedBadges) setEarnedBadges(updatedBadges.map((b) => b.badge_id));
          }
        }
      } catch (e) {
        console.error("Error checking achievements/profile", e);
      }
    };
    fetchProfileData();
  }, [user]);

  const badgesList = [
    { id: "first_analysis", label: "Primeira Análise", icon: Star },
    { id: "streak_7", label: "Streak 7 dias", icon: Zap },
    { id: "score_7", label: "Score 7+", icon: TrendingUp },
    { id: "elite_level", label: "Nível Elite", icon: Crown },
  ];

  const displayBadges = badgesList.map((badge) => ({
    ...badge,
    earned: earnedBadges.includes(badge.id),
  }));

  const ger = lastAnalysis?.ger || 0;
  const currentTier = getTier(ger);
  const totalAnalyses = history.length;

  let strongest = "geral";
  let weakest = "geral";
  if (lastAnalysis && Array.isArray(lastAnalysis.categories) && lastAnalysis.categories.length > 0) {
    const sorted = [...lastAnalysis.categories].sort((a, b) => b.score - a.score);
    if (sorted.length > 0) strongest = sorted[0].name.toLowerCase();
    if (sorted.length > 1) weakest = sorted[sorted.length - 1].name.toLowerCase();
  }

  const nextTier = getNextTier(ger);
  const nextTierName = nextTier ? nextTier.name : "max";
  const nextTierMin = nextTier ? nextTier.min : 100;
  const pointsNeeded = Math.max(0, nextTierMin - ger);
  const currentTierMin = currentTier.min;
  const progressToNext = nextTier
    ? Math.max(0, Math.min(1, (ger - currentTierMin) / (nextTier.min - currentTierMin)))
    : 1;
  const progressPercent = Math.round(progressToNext * 100);
  const nextTierLabel = nextTier ? nextTier.label : "Nível máximo";

  const displayName =
    (user && (user.user_metadata?.full_name || user.user_metadata?.name || user.email)) || "Usuário MAXIMARE";

  const isAdmin = profile?.is_admin || user?.email === "xavierluisfelipe12@gmail.com";
  const isCreator = !!profile?.is_ugc;

  const menuItems: MenuItem[] = [
    { label: "Plano", icon: Crown, desc: isPremium ? "Gerenciar assinatura" : "Seja Premium", path: "/premium" },
    { label: "Progresso", icon: TrendingUp, desc: "Seu histórico", path: "/progress" },
    { label: "Configurações", icon: Settings, desc: "Preferências", path: "#", onClick: () => setShowPreferences(true) },
    { label: "Privacidade", icon: Shield, desc: "Seus dados", path: "/privacy" },
    ...(isCreator ? [{ label: "Painel de Criador", icon: LayoutDashboard, desc: "Ferramentas para criador UGC", path: "/creator" }] : []),
    ...(isAdmin ? [{ label: "Admin Dashboard", icon: LayoutDashboard, desc: "Painel Administrativo", path: "/admin" }] : []),
  ];

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("pt-BR").format(d);
  };

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: COLORS.bg, padding: "0 24px" }}>
      <div className="max-w-lg mx-auto pt-8 space-y-5">

        {/* ─── PROFILE HEADER ─── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
          <div className="relative group">
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
            <div
              className="h-[88px] w-[88px] rounded-full flex items-center justify-center mb-3 overflow-hidden relative cursor-pointer"
              style={{ background: avatarUrl ? "transparent" : "linear-gradient(135deg, #4F6EF7 0%, #3B5DE7 100%)" }}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                </div>
              )}
              {avatarUrl ? (
                <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[28px] font-bold" style={{ color: COLORS.textPrimary }}>
                  {displayName ? displayName.substring(0, 1).toUpperCase() : "M"}
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6" style={{ color: COLORS.textPrimary }} />
              </div>
            </div>
          </div>

          <h1 className="text-[20px] font-bold" style={{ color: COLORS.textPrimary }}>{displayName}</h1>

          {profileUsername && !/^[0-9a-f]{8}-[0-9a-f]{4}/.test(profileUsername) && (
            <span className="text-[13px] mt-0.5" style={{ color: COLORS.textSecondary }}>@{profileUsername}</span>
          )}

          {shortId && (
            <div
              className="flex items-center gap-1.5 mt-2 cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(shortId);
                toast.success("ID copiado!");
              }}
            >
              <span className="text-[11px] font-mono" style={{ color: COLORS.textTertiary }}>ID: {shortId}</span>
              <Copy className="h-3 w-3" style={{ color: COLORS.textTertiary }} />
            </div>
          )}

          {/* Inline metrics */}
          <p className="text-[13px] mt-3" style={{ color: COLORS.textSecondary }}>
            {totalAnalyses} Análises <span style={{ color: COLORS.textTertiary }}>·</span>{" "}
            {currentTier.name.toUpperCase()} <span style={{ color: COLORS.textTertiary }}>·</span>{" "}
            {ger} Aura
          </p>
        </motion.div>

        {/* ─── PREMIUM STATUS CARD ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          {isPremium ? (
            <div
              className="rounded-[20px] p-4"
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.blue}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${COLORS.blue}15` }}
                >
                  <Crown className="h-5 w-5" style={{ color: COLORS.blue }} />
                </div>
                <div className="flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: COLORS.blue }}>
                    Premium Ativo
                  </span>
                  <p className="text-[16px] font-semibold mt-0.5" style={{ color: COLORS.textPrimary }}>
                    {planType === "yearly" ? "Plano Anual" : "Plano Premium"}
                  </p>
                </div>
              </div>
              {expiresAt && (
                <p className="text-[13px] mt-3" style={{ color: COLORS.textSecondary }}>
                  {subscriptionStatus === "canceled" ? "Expira em: " : "Renova em: "}
                  {formatDate(expiresAt)}
                </p>
              )}
              <button
                onClick={() => navigate("/cancel-subscription")}
                className="w-full mt-3 py-2 rounded-xl text-[13px] font-medium transition-colors"
                style={{ color: "rgba(255,100,100,0.8)", backgroundColor: "rgba(255,100,100,0.08)", border: "1px solid rgba(255,100,100,0.15)" }}
              >
                Cancelar assinatura
              </button>
            </div>
          ) : (
            <div
              className="rounded-[20px] p-4 cursor-pointer"
              style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
              onClick={() => navigate("/premium")}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLORS.blue}15` }}>
                  <Crown className="h-5 w-5" style={{ color: COLORS.textTertiary }} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: COLORS.textSecondary }}>Plano Atual</p>
                  <p className="text-[16px] font-semibold" style={{ color: COLORS.textPrimary }}>FREE</p>
                </div>
                <ChevronRight className="h-5 w-5" style={{ color: COLORS.textTertiary }} />
              </div>
            </div>
          )}
        </motion.div>

        {/* ─── ANÁLISE ESTRATÉGICA ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-[20px] p-5"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Sparkles className="h-5 w-5" style={{ color: COLORS.blue }} />
            <h2 className="text-[16px] font-bold" style={{ color: COLORS.textPrimary }}>Análise Estratégica</h2>
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: COLORS.textSecondary }}>
            Aura atual: <strong style={{ color: COLORS.textPrimary }}>{ger}</strong> ({currentTier.name.toUpperCase()}).
            Pontos fortes em <strong style={{ color: COLORS.textPrimary }}>{strongest}</strong>.
          </p>
          {pointsNeeded > 0 && (
            <p className="text-[14px] font-semibold mt-2" style={{ color: COLORS.blue }}>
              +{pointsNeeded} pontos para {nextTierName.toUpperCase()}
            </p>
          )}
        </motion.div>

        {/* ─── TIER / AURA CARD ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[20px] p-5"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider" style={{ color: COLORS.textSecondary }}>Tier Atual</p>
              <p className="text-[22px] font-bold mt-0.5" style={{ color: COLORS.textPrimary }}>{currentTier.name.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-[22px] font-bold" style={{ color: COLORS.blue }}>{ger} Aura</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1.5" style={{ color: COLORS.textSecondary }}>
              <span>{currentTier.label}</span>
              <span>{nextTier ? `${nextTierLabel} (${nextTierMin}+)` : "Nível máximo"}</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: COLORS.blue }}
              />
            </div>
            {nextTier && (
              <p className="mt-1.5 text-[11px] text-right" style={{ color: COLORS.textSecondary }}>
                Faltam <span style={{ color: COLORS.blue, fontWeight: 600 }}>+{pointsNeeded}</span> para {nextTierLabel}
              </p>
            )}
          </div>
        </motion.div>

        {/* ─── MEDALHAS ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
          <h3 className="text-[14px] font-bold mb-3" style={{ color: COLORS.textPrimary }}>Medalhas</h3>
          <div className="grid grid-cols-4 gap-2">
            {displayBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-[16px] aspect-square"
                  style={{
                    backgroundColor: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    opacity: badge.earned ? 1 : 0.3,
                  }}
                >
                  <Icon
                    className="h-6 w-6"
                    style={{ color: badge.earned ? COLORS.blue : COLORS.textTertiary }}
                  />
                  <span
                    className="text-[10px] text-center leading-tight px-1 font-medium"
                    style={{ color: badge.earned ? COLORS.textPrimary : COLORS.textTertiary }}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ─── QUEM É SEU SÓSIA ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Link
            to="/look-alike"
            className="block rounded-[20px] p-5 transition-all hover:opacity-90"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.blue}30` }}
          >
            <div className="flex items-center gap-4">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.blue}15` }}
              >
                <Search className="h-6 w-6" style={{ color: COLORS.blue }} />
              </div>
              <div className="flex-1">
                <h3 className="text-[16px] font-bold" style={{ color: COLORS.textPrimary }}>Quem é seu sósia?</h3>
                <p className="text-[12px]" style={{ color: COLORS.textSecondary }}>Descubra com qual famoso você se parece.</p>
              </div>
              <ChevronRight className="h-5 w-5" style={{ color: COLORS.textTertiary }} />
            </div>
          </Link>
        </motion.div>

        {/* ─── MENU ITEMS ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div
                  className="flex items-center gap-3 rounded-[16px] p-4 cursor-pointer transition-opacity hover:opacity-80"
                  style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLORS.blue}15` }}>
                    <Icon className="h-5 w-5" style={{ color: COLORS.blue }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium" style={{ color: COLORS.textPrimary }}>{item.label}</p>
                    <p className="text-[12px]" style={{ color: COLORS.textSecondary }}>{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: COLORS.textTertiary }} />
                </div>
              );

              if (item.path.startsWith("/")) {
                return (
                  <Link key={item.label} to={item.path} onClick={item.onClick}>
                    {content}
                  </Link>
                );
              }
              return (
                <div key={item.label} onClick={item.onClick}>
                  {content}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ─── LOGOUT ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-[15px] font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#EF4444" }}
          >
            <LogOut className="h-5 w-5" />
            Sair da conta
          </button>
        </motion.div>

        {/* Spacer for bottom nav */}
        <div className="h-4" />

        {/* ─── PREFERENCES DIALOG ─── */}
        <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
          <DialogContent className="max-w-sm rounded-2xl" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>Preferências</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Modo escuro</p>
                  <p className="text-xs" style={{ color: COLORS.textSecondary }}>Altere entre tema claro e escuro.</p>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: COLORS.textSecondary }}>
                {theme === "dark" ? (
                  <>
                    <Moon className="h-4 w-4" />
                    <span>Ativo: modo escuro</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    <span>Ativo: modo claro</span>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
