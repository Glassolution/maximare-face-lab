import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
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
  updateUserData: (data: Partial<Pick<UserData, "last_analysis_score" | "analysis_history" | "preferences">>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERNAME_DOMAIN = "@maximare.local";

import { logger } from "@/lib/logger";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      logger.log("[Auth]", "Fetching profile for:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        logger.error("[Auth]", "Profile fetch error:", error);
      }
      
      if (data) {
        logger.log("[Auth]", "Profile loaded:", {
            status: data.subscription_status,
            premium: data.is_premium,
            plan: data.plan_type
        });
        setProfile(data as Profile);
      }
    } catch (e) {
      logger.error("[Auth]", "Unexpected profile error:", e);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_data")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (data) setUserData(data as UserData);
    } catch (e) {
      logger.error("[Auth]", "UserData error:", e);
    }
  };

  const loadUserData = async (userId: string) => {
    await Promise.all([fetchProfile(userId), fetchUserData(userId)]);
  };

  // Exposed function to force reload everything (e.g. after payment)
  // Debounced: prevents running more than once every 5 seconds
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const refreshSession = async () => {
    const now = Date.now();
    if (now - lastRefreshTime < 5000) {
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
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
        loadUserData(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      if (error.message.includes("already registered")) return { error: "Esse username já está em uso." };
      return { error: error.message };
    }

    return { error: null };
  };

  const signIn = async (username: string, password: string): Promise<{ error: string | null }> => {
    const clean = username.trim().toLowerCase();
    if (!clean || !password) return { error: "Preencha todos os campos." };

    const email = `${clean}${USERNAME_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: "Username ou senha incorretos." };
    }

    return { error: null };
  };

  const signOut = async () => {
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
    await supabase
      .from("user_data")
      .update(data)
      .eq("user_id", user.id);
    await fetchUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, userData, loading, signUp, signIn, signOut, refreshUserData, refreshSession, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
