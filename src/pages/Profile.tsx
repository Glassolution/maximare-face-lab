import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, ChevronRight, Settings, Shield, Zap, Star, TrendingUp, Search, LogOut, Moon, Sun, CreditCard, Copy, Upload, Camera, LayoutDashboard } from "lucide-react";
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
import { CancelSubscriptionWizard } from "@/components/CancelSubscriptionWizard";
import { avatarService } from "@/services/avatarService";

type MenuItem = {
  label: string;
  icon: typeof Crown;
  desc: string;
  path: string;
  onClick?: () => void;
};

export default function Profile() {
  const { user, profile } = useAuth();
  const { isPremium, subscriptionStatus, expiresAt, planType } = usePremiumStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const history = getAnalysisHistory();
  const lastAnalysis = history.length > 0 ? (history[0] as unknown as ExtendedAnalysisResult) : null;
  const { theme, setTheme } = useTheme();
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCancelWizard, setShowCancelWizard] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  
  const [shortId, setShortId] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sync state with profile from context
  useEffect(() => {
    if (profile) {
        // Prioritize public_id (migrated/new system), fallback to short_id
        if (profile.public_id) setShortId(profile.public_id.toString());
        else if (profile.short_id) setShortId(profile.short_id);

        if (profile.username) setProfileUsername(profile.username);
        
        if (profile.avatar_url) {
            setAvatarUrl(avatarService.getAvatarPublicUrl(profile.avatar_url));
        } else if (lastAnalysis?.image_url) {
            // Fallback: Use last analysis image if no custom avatar set
            setAvatarUrl(lastAnalysis.image_url);
        }
    }
  }, [profile, lastAnalysis]);
  
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || event.target.files.length === 0) {
          return;
      }
      
      const file = event.target.files[0];
      setUploadingAvatar(true);
      
      try {
          const { publicUrl, path } = await avatarService.uploadAvatar(file);
          
          // Force refresh avatar with timestamp to bypass browser cache immediately
          const timestampedUrl = `${publicUrl}?t=${new Date().getTime()}`;
          setAvatarUrl(timestampedUrl);
          
          toast.success("Foto de perfil atualizada!", { icon: "📸" });
      } catch (error) {
          console.error("Erro ao atualizar avatar:", error);
          toast.error("Erro ao atualizar foto de perfil.");
      } finally {
          setUploadingAvatar(false);
      }
  };
  
  // Fetch badges and short_id fallback
  useEffect(() => {
    if (location.state?.premiumActivated) {
        toast.success("Assinatura Premium ativada com sucesso!", {
            duration: 5000,
            icon: "👑"
        });
        // Clear state to avoid showing it again on refresh
        navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location]);

  useEffect(() => {
    const fetchProfileData = async () => {
        if (!user) return;
        
        try {
            // Fetch Short ID and Username (fallback if not in context yet)
            if (!shortId) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('short_id, public_id, username')
                    .eq('id', user.id)
                    .maybeSingle();
                
                if (profileData) {
                    if (profileData.public_id) setShortId(profileData.public_id.toString());
                    else if (profileData.short_id) setShortId(profileData.short_id);
                    
                    if (profileData.username) setProfileUsername(profileData.username);
                }
            }

            // 1. Get existing badges first for instant load
            const { data: currentBadges } = await supabase
                .from('user_badges')
                .select('badge_id')
                .eq('user_id', user.id);
                
            if (currentBadges) {
                setEarnedBadges(currentBadges.map(b => b.badge_id));
            }

            // 2. Run evaluation in background to check for new ones (with fresh token)
            const token = await getValidAccessToken();
            if (token) {
                const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
                const { data, error } = await supabase.functions.invoke('check-achievements', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        apikey: anon,
                        "sb-access-token": token,
                        "x-supabase-auth": token
                    }
                });
                
                if (!error && data?.badges_awarded && data.badges_awarded.length > 0) {
                     // Refresh if new badges awarded
                     const { data: updatedBadges } = await supabase
                        .from('user_badges')
                        .select('badge_id')
                        .eq('user_id', user.id);
                        
                     if (updatedBadges) {
                        setEarnedBadges(updatedBadges.map(b => b.badge_id));
                     }
                }
            }
        } catch (e) {
            console.error("Error checking achievements/profile", e);
        }
    };
    
    fetchProfileData();
  }, [user]);

  const badgesList = [
    { id: 'first_analysis', label: "Primeira Análise", icon: Star },
    { id: 'streak_7', label: "Streak 7 dias", icon: Zap },
    { id: 'score_7', label: "Score 7+", icon: TrendingUp },
    { id: 'elite_level', label: "Nível Elite", icon: Crown },
  ];

  const displayBadges = badgesList.map(badge => ({
    ...badge,
    earned: earnedBadges.includes(badge.id)
  }));
  
  // Calculate stats
  const ger = lastAnalysis?.ger || 0;
  const currentTier = getTier(ger);
  const totalAnalyses = history.length;
  
  // Determine strongest/weakest for copy
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

  const isAdmin = profile?.is_admin || user?.email === 'xavierluisfelipe12@gmail.com';
  const isCreator = !!profile?.is_ugc;

  const menuItems: MenuItem[] = [
    { label: "Plano Pro", icon: Crown, desc: isPremium ? "Gerenciar assinatura" : "Desbloqueie tudo", path: isPremium ? "#" : "/premium", onClick: isPremium ? () => setShowSubscription(true) : undefined },
    { label: "Progresso", icon: TrendingUp, desc: "Seu histórico", path: "/progress" },
    { label: "Configurações", icon: Settings, desc: "Preferências", path: "#", onClick: () => setShowPreferences(true) },
    { label: "Privacidade", icon: Shield, desc: "Seus dados", path: "/privacy" },
    ...(isCreator ? [{
      label: "Painel de Criador",
      icon: LayoutDashboard,
      desc: "Ferramentas para criador UGC",
      path: "/creator"
    }] : []),
    ...(isAdmin ? [{
      label: "Admin Dashboard",
      icon: LayoutDashboard,
      desc: "Painel Administrativo",
      path: "/admin"
    }] : []),
  ];

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat('pt-BR').format(d);
  };

  // Determine what to display
  // Logic: 
  // 1. Always show short_id if available (per user request: "volte a usar os IDs de 4 casas")
  // 2. If custom username exists, show that too.
  
  const displayId = shortId ? `ID: ${shortId}` : (profileUsername ? `@${profileUsername}` : "Sem ID");
  const copyText = shortId || profileUsername || "";

  return (
    <div className="min-h-screen pt-6 pb-28 px-4">
      <div className="container max-w-lg mx-auto space-y-6">

        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center pt-4"
        >
          <div className="relative group">
              <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
              />
              <div 
                  className="h-24 w-24 rounded-full glass-strong flex items-center justify-center mb-3 glow-sm overflow-hidden relative cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
              >
                 {isPremium && (
                    <div className="absolute -top-1 -right-1 z-20 bg-background rounded-full p-0.5 shadow-sm">
                       <Star className="h-6 w-6 text-amber-400 fill-amber-400 drop-shadow-md animate-pulse" />
                    </div>
                 )}
                 {uploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                 ) : null}
                 
                 {avatarUrl ? (
                     <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                 ) : (
                     <span className="font-heading text-2xl font-bold text-gradient">
                        {displayName ? displayName.substring(0, 1).toUpperCase() : "M"}
                     </span>
                 )}
                 
                 {/* Overlay for hover effect */}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white h-6 w-6" />
                 </div>
              </div>
          </div>
          
          <div className="flex flex-col items-center gap-1 mt-1">
            <h1 className="font-heading text-xl font-bold text-foreground">
              {displayName}
            </h1>
            <div className="flex flex-col items-center gap-1">
                {profileUsername && !/^[0-9a-f]{8}-[0-9a-f]{4}/.test(profileUsername) && (
                    <span className="text-sm text-muted-foreground">@{profileUsername}</span>
                )}
                
                {shortId && (
                    <div 
                        className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded-full cursor-pointer hover:bg-muted transition-colors group mt-1"
                        onClick={() => {
                            navigator.clipboard.writeText(shortId);
                            toast.success("ID copiado!", { duration: 2000 });
                        }}
                    >
                         <span className="text-[12px] text-muted-foreground font-mono font-bold tracking-widest">
                            ID: {shortId}
                         </span>
                         <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">{totalAnalyses} análise{totalAnalyses !== 1 ? "s" : ""} realizada{totalAnalyses !== 1 ? "s" : ""}</p>
        
          {/* Status Badge */}
          <div className="w-full mt-6 px-2">
            {isPremium ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 shadow-lg shadow-amber-500/10 p-4">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full blur-2xl -mr-10 -mt-10" />
                 
                 <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                            <Crown className="h-5 w-5 text-amber-600 fill-amber-600" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-200/50 px-1.5 py-0.5 rounded-md">Premium Ativo</span>
                            </div>
                            <p className="text-xs text-amber-800/80 mt-1 font-medium">
                                {planType === 'premium_monthly' ? 'Plano Mensal' : planType === 'premium_yearly' ? 'Plano Anual' : 'Plano Premium'}
                            </p>
                        </div>
                    </div>
                    
                    <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setShowSubscription(true)}
                        className="h-8 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-200/50 hover:text-amber-800"
                    >
                        Gerenciar
                    </Button>
                 </div>
                 {expiresAt && (
                    <div className="mt-3 pt-3 border-t border-amber-200/50 flex items-center gap-2 text-[10px] text-amber-800/70">
                        <CreditCard className="h-3 w-3" />
                        <span>
                          {subscriptionStatus === 'canceled' 
                            ? 'Sua assinatura expirará em: ' 
                            : 'Renova em: '}
                          <strong>{formatDate(expiresAt)}</strong>
                        </span>
                    </div>
                 )}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm p-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Plano Atual</p>
                            <p className="text-sm font-bold text-foreground">FREE</p>
                        </div>
                    </div>
                    
                    <Link to="/premium">
                        <Button 
                            size="sm" 
                            className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md glow-sm"
                        >
                            <Zap className="h-3 w-3 mr-1.5 fill-current" />
                            Seja Premium
                        </Button>
                    </Link>
                 </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* FIFA Analysis Block */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card border border-primary/20 rounded-2xl p-5 shadow-lg relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <Crown className="w-24 h-24" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{currentTier.badge}</span>
                    <h2 className="font-heading text-lg font-bold">Análise Estratégica</h2>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
                Sua <strong>Aura atual é {ger}</strong> ({currentTier.name.toUpperCase()}). 
                Seu visual tem pontos fortes em <strong>{strongest}</strong>. 
                Para virar <strong>{nextTierName.toUpperCase()} ({nextTierMin}+)</strong>, 
                foque em melhorar <strong>{weakest}</strong>.
            </p>
                
                {pointsNeeded > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary">
                        <TrendingUp className="h-4 w-4" />
                        Faltam +{pointsNeeded} pontos para subir de nível.
                    </div>
                )}
            </div>
        </motion.div>

        {/* Rank Card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl glass-strong p-5 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Tier Atual</p>
              <p className="font-heading text-2xl font-bold text-gradient uppercase">{currentTier.name}</p>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl font-bold text-foreground">{ger}</p>
              <p className="text-[10px] text-muted-foreground">Aura</p>
            </div>
          </div>

          {/* Rank progress */}
          <div className="relative z-10 mt-4">
            <div className="flex justify-between items-center text-[11px] text-muted-foreground mb-1">
              <span className="font-medium">Atual: {currentTier.label}</span>
              {nextTier ? (
                <span>Próximo: {nextTierLabel} ({nextTierMin}+)</span>
              ) : (
                <span>No topo do ranking</span>
              )}
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
            {nextTier && (
              <div className="mt-1 text-[10px] text-muted-foreground text-right">
                Faltam <span className="text-primary font-semibold">+{pointsNeeded}</span> para {nextTierLabel}.
              </div>
            )}
          </div>
        </motion.div>

        {/* Badges */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="font-heading text-sm font-bold text-foreground mb-3">Medalhas</h3>
          <div className="grid grid-cols-4 gap-2">
            {displayBadges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <div key={badge.label} className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl glass ${!badge.earned ? "opacity-30" : ""}`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${badge.earned ? "bg-primary/15" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${badge.earned ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight">{badge.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Look Alike Feature */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <Link to="/look-alike" className="block relative rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-5 border border-indigo-500/20 overflow-hidden cursor-pointer hover:border-indigo-500/40 transition-colors group">
             <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className="flex items-center gap-4 relative z-10">
                <div className="h-12 w-12 rounded-full bg-background/50 flex items-center justify-center border border-indigo-500/20">
                   <Search className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                   <h3 className="font-heading font-bold text-lg text-foreground">Quem é seu sósia?</h3>
                   <p className="text-xs text-muted-foreground">Descubra com qual famoso você se parece.</p>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground group-hover:text-indigo-400 transition-colors" />
             </div>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              if (item.path.startsWith("/")) {
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={item.onClick}
                    className="flex items-center gap-3 rounded-2xl glass p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              }
              return (
                <div
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center gap-3 rounded-2xl glass p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Button
            variant="ghost"
            onClick={async () => { 
              await supabase.auth.signOut(); 
              navigate("/login", { state: { mode: "login" } }); 
            }}
            className="w-full rounded-2xl glass p-4 h-auto flex items-center gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Sair da conta</p>
              <p className="text-[11px] opacity-70">Encerrar sessão</p>
            </div>
          </Button>
        </motion.div>
        <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">Preferências</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Modo escuro</p>
                  <p className="text-xs text-muted-foreground">
                    Altere entre tema claro e escuro.
                  </p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

        <Dialog open={showSubscription} onOpenChange={setShowSubscription}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                Sua Assinatura
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full uppercase">Ativo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Plano</span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {planType === 'premium_monthly' ? 'Mensal' : (planType === 'premium_yearly' ? 'Anual' : 'Semanal')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">Expira em</span>
                  <span className="text-sm text-muted-foreground">{formatDate(expiresAt)}</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-center px-4">
                <p>Para gerenciar ou cancelar sua assinatura, utilize a plataforma do Mercado Pago ou entre em contato com o suporte.</p>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://www.mercadopago.com.br/subscriptions', '_blank')}
              >
                Ir para Mercado Pago
              </Button>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => { setShowSubscription(false); setShowCancelWizard(true); }}
              >
                Cancelar assinatura
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <CancelSubscriptionWizard open={showCancelWizard} onOpenChange={setShowCancelWizard} />
      </div>
    </div>
  );
}
