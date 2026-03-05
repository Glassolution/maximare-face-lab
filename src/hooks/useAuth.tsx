import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { clearLocalHistory } from "@/lib/mockData";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  short_id?: string | null;
  public_id?: number | null;
  subscription_status?: string;
  subscription_expires_at?: string | null;
  premium?: boolean;
  is_premium?: boolean;
  plan_type?: string;
  is_admin?: boolean;
  is_ugc?: boolean;
  last_payment_at?: string | null;
  payment_provider?: string | null;
  provider_payment_id?: string | null;
  provider_subscription_id?: string | null;
}

interface UserData {
  id: string;
  user_id: string;
  last_analysis_score: number | null;
  analysis_history: any[];
  preferences: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (username: string, password: string) => Promise<{ error: string | null }>;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshSession: (forceRefresh?: boolean) => Promise<void>;
  refreshProfile: () => Promise<void>;  // New: refresh profile without JWT refresh
  updateUserData: (data: Partial<Pick<UserData, "last_analysis_score" | "analysis_history" | "preferences">>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERNAME_DOMAIN = "@maximare.local";

import { logger } from "@/lib/logger";
import { trackEvent, identifyUser } from "@/lib/posthog";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("[Auth]", "Fetching profile for:", userId);
      // Fetch profile by id (which should match auth user id)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      console.log("[Auth]", "Profile query result:", { data, error });
      
      if (error) {
        console.error("[Auth]", "Profile fetch error:", error);
        return;
      }
      
      if (data) {
        console.log("[Auth]", "Profile loaded:", {
            id: data.id,
            status: data.subscription_status,
            premium: data.is_premium,
            plan: data.plan_type,
            expires: data.subscription_expires_at
        });
        setProfile(data as Profile);
      } else {
        // Profile missing (0 rows) - Try to create it automatically
        console.log("[Auth]", "Profile missing, attempting to create...");
        const { error: insertError } = await supabase.from('profiles').insert({
            user_id: userId,
            username: `user_${userId.substring(0, 8)}`,
        });

        if (insertError) {
             console.error("[Auth]", "Failed to auto-create profile:", insertError);
        } else {
             // Retry fetch
             const { data: newData } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();
             if (newData) setProfile(newData as Profile);
        }
      }
    } catch (e) {
      console.error("[Auth]", "Unexpected profile error:", e);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // CORRIGIDO: Buscar de 'profiles' em vez de 'user_data' (tabela não existe)
      const { data } = await supabase
        .from("profiles")
        .select("id, created_at, updated_at, is_premium, plan_type, subscription_status")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setUserData(data as unknown as UserData);
    } catch (e) {
      logger.error("[Auth]", "UserData error:", e);
    }
  };

  const loadUserData = async (userId: string) => {
    await Promise.all([fetchProfile(userId), fetchUserData(userId)]);
  };

  // Exposed function to force reload everything (e.g. after payment)
  // Debounced: prevents running more than once every 2 seconds (reduced from 5s)
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const refreshSession = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastRefreshTime < 2000) {
        logger.log("[Auth]", "Refresh skipped (debounce active)");
        return;
    }
    setLastRefreshTime(now);

    logger.log("[Auth]", "Forcing session refresh...");
    const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
    
    if (error) {
        logger.error("[Auth]", "Session refresh failed:", error);
    }

    if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        await loadUserData(newSession.user.id);
        logger.log("[Auth]", "Session refreshed & data reloaded.");
    }
  };

  // New: Refresh profile only (without JWT refresh) - for realtime updates
  const refreshProfile = async () => {
    if (!user?.id) {
      logger.log("[Auth]", "refreshProfile: no user id");
      return;
    }
    logger.log("[Auth]", "Refreshing profile only...");
    await fetchProfile(user.id);
    logger.log("[Auth]", "Profile refreshed.");
  };

  useEffect(() => {
    let realtimeChannel: any = null;

    const setupRealtime = (userId: string) => {
      // Subscribe to profile changes in real-time
      realtimeChannel = supabase
        .channel(`profile-realtime-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[Auth] Realtime profile update received:', payload.new);
            setProfile(payload.new as Profile);
          }
        )
        .subscribe();

      console.log('[Auth] Realtime subscription enabled for profile:', userId);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        if (event === 'SIGNED_OUT') {
            // Clear sensitive local data on sign out
            clearLocalHistory();
            if (realtimeChannel) {
              supabase.removeChannel(realtimeChannel);
              realtimeChannel = null;
            }
        }
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          // Setup realtime for the new user
          setupRealtime(sess.user.id);
          setTimeout(() => loadUserData(sess.user.id), 0);
        } else {
          setProfile(null);
          setUserData(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setupRealtime(sess.user.id);
        loadUserData(sess.user.id);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  const signUp = async (username: string, password: string): Promise<{ error: string | null }> => {
    const clean = username.trim().toLowerCase();

    if (clean.length < 3) return { error: "Username deve ter pelo menos 3 caracteres." };
    if (/\s/.test(clean)) return { error: "Username não pode conter espaços." };
    if (!/^[a-z0-9._]+$/.test(clean)) return { error: "Username só pode conter letras, números, ponto e underscore." };
    if (password.length < 8) return { error: "Senha deve ter pelo menos 8 caracteres." };

    // Check if username exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", clean)
      .maybeSingle();

    if (existing) return { error: "Esse username já está em uso." };

    const email = `${clean}${USERNAME_DOMAIN}`;
    const { data: signUpData, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      if (error.message.includes("already registered")) return { error: "Esse username já está em uso." };
      return { error: error.message };
    }

    // PostHog: identify and track new sign-up
    if (signUpData?.user) {
      identifyUser(signUpData.user.id, {
        username: clean,
        $set_once: { first_sign_up: new Date().toISOString() },
      });
      trackEvent(signUpData.user.id, 'user_signed_up', {
        username: clean,
      });
    }

    return { error: null };
  };

  const signIn = async (username: string, password: string): Promise<{ error: string | null }> => {
    const clean = username.trim().toLowerCase();
    if (!clean || !password) return { error: "Preencha todos os campos." };

    const email = `${clean}${USERNAME_DOMAIN}`;
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: "Username ou senha incorretos." };
    }

    // PostHog: identify and track login
    if (signInData?.user) {
      identifyUser(signInData.user.id, {
        username: clean,
        last_login: new Date().toISOString(),
      });
      trackEvent(signInData.user.id, 'user_logged_in', {
        username: clean,
      });
    }

    return { error: null };
  };

  const signOut = async () => {
    // PostHog: track sign-out before clearing user state
    if (user) {
      trackEvent(user.id, 'user_logged_out');
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserData(null);
  };

  const refreshUserData = async () => {
    if (user) await loadUserData(user.id);
  };

  const updateUserData = async (data: Partial<Pick<UserData, "last_analysis_score" | "analysis_history" | "preferences">>) => {
    if (!user) return;
    // CORRIGIDO: Atualizar 'profiles' em vez de 'user_data' (tabela não existe)
    // Nota: profiles pode não ter todos os campos de user_data, então filtramos apenas os que existem
    const profileData: any = {};
    if ('preferences' in data) profileData.preferences = data.preferences;
    
    if (Object.keys(profileData).length > 0) {
      await supabase
        .from("profiles")
        .update(profileData)
        .eq("user_id", user.id);
    }
    await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, userData, loading, signUp, signIn, signOut, refreshUserData, refreshSession, refreshProfile, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
