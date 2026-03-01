import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Analysis from "@/pages/Analysis";
import Results from "@/pages/Results";
import GerResults from "@/pages/GerResults";
import Recommendations from "@/pages/Recommendations";
import ProgressPage from "@/pages/Progress";
import Trends from "@/pages/Trends";
import Friends from "@/pages/Friends";
import Battles from "@/pages/Battles";
import BattleRoom from "@/pages/BattleRoom";
import Profile from "@/pages/Profile";
import LookAlike from "@/pages/LookAlike";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Premium from "@/pages/Premium";
import Admin from "@/pages/Admin";
import Subscription from "@/pages/Subscription";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useEffect, useState } from "react";
import { usePaywallGate } from "@/hooks/usePaywallGate";
import { PaywallDialog } from "@/components/paywall/PaywallDialog";
import { syncHistoryWithSupabase } from "@/lib/mockData";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

import UpdatePassword from "@/pages/UpdatePassword";

import { usePaywallStore } from "@/lib/paywallStore";

const queryClient = new QueryClient();

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  // ... existing hideNav logic ...
  const hideNav = ["/", "/onboarding", "/login", "/premium", "/landing", "/update-password", "/subscription"].includes(location.pathname) || location.pathname.startsWith("/admin");

  const { user, loading } = useAuth();
  const { openPopup } = usePaywallStore();
  
  const { checkGate, isPaywallOpen, closePaywall } = usePaywallGate();
  const { isPremium } = usePremiumStatus();

  useEffect(() => {
    if (user) {
      // Sync history when user is available (merge remote with local)
      syncHistoryWithSupabase();
    }
  }, [user]);

  useEffect(() => {
    const checkPeriodicPaywall = async () => {
      if (!user || loading || isPremium) return;
      if (location.pathname === "/premium" || location.pathname === "/login" || location.pathname === "/" || location.pathname === "/update-password") return;
      
      // Only check on main tabs to avoid spamming while navigating sub-pages
      const mainTabs = ["/analysis", "/profile", "/trends", "/progress"];
      if (mainTabs.some(path => location.pathname.startsWith(path))) {
         // await checkGate({ trigger: 'app_open' }); // Disabled as per user request
      }
    };
    
    // Small delay to ensure page is loaded and user interaction is likely
    const timer = setTimeout(checkPeriodicPaywall, 2000);
    return () => clearTimeout(timer);
  }, [location.pathname, user, loading, isPremium, checkGate]);

  // Force Paywall after Login
  useEffect(() => {
    if (user && !loading && !isPremium && location.state && (location.state as any).showPaywallOnEntry) {
       console.log("[App] Triggering login paywall force");
       checkGate({ trigger: 'periodic_force' });
       // Clear the state to prevent re-triggering
       navigate(location.pathname, { replace: true, state: {} });
    }
  }, [user, loading, isPremium, location, checkGate, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Carregando conta...</span>
      </div>
    );
  }

  if (user && location.pathname === "/login") {
    return <Navigate to="/analysis" replace />;
  }

  // Prevent re-accessing Quiz/Landing if already accessed
  const hasAccessedQuiz = localStorage.getItem('maximare_quiz_accessed') === 'true';
  if (hasAccessedQuiz && (location.pathname === "/onboarding" || location.pathname === "/")) {
    return <Navigate to={user ? "/analysis" : "/login"} replace />;
  }

  if (
    !user &&
    location.pathname !== "/login" &&
    location.pathname !== "/" &&
    location.pathname !== "/onboarding" &&
    location.pathname !== "/update-password"
  ) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/ger-results/:id" element={<GerResults />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/battles" element={<Battles />} />
        <Route path="/battle/:id" element={<BattleRoom />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/look-alike" element={<LookAlike />} />
        <Route path="/login" element={<Login />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNav && <BottomNav />}
      <PaywallDialog isOpen={isPaywallOpen} onClose={closePaywall} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Layout />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
