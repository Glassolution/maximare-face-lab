import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
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
import CreatorDashboard from "@/pages/CreatorDashboard";
import CreatorMetrics from "@/pages/CreatorMetrics";
import LookAlike from "@/pages/LookAlike";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Premium from "@/pages/Premium";
import Checkout from "@/pages/Checkout";
import Admin from "@/pages/Admin";
import Subscription from "@/pages/Subscription";
import PaymentCallback from "@/pages/PaymentCallback";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useEffect } from "react";
import { syncHistoryWithSupabase } from "@/lib/mockData";
import UpdatePassword from "@/pages/UpdatePassword";

const queryClient = new QueryClient();

function Layout() {
  const location = useLocation();
  const hideNav = ["/", "/onboarding", "/login", "/premium", "/checkout", "/landing", "/update-password", "/subscription", "/payment-callback"].includes(location.pathname) || location.pathname.startsWith("/admin");

  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      syncHistoryWithSupabase();
    }
  }, [user]);

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
        <Route path="/creator" element={<CreatorDashboard />} />
        <Route path="/creator/metrics" element={<CreatorMetrics />} />
        <Route path="/look-alike" element={<LookAlike />} />
        <Route path="/login" element={<Login />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNav && <BottomNav />}
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
