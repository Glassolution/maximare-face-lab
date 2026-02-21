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
import Profile from "@/pages/Profile";
import LookAlike from "@/pages/LookAlike";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Premium from "@/pages/Premium";
import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useEffect, useState } from "react";
import { shouldShowPaywall } from "@/lib/paywall";
import PaywallModal from "@/components/PaywallModal";
import { useNavigate } from "react-router-dom";

const queryClient = new QueryClient();

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = ["/", "/onboarding", "/login", "/premium"].includes(location.pathname);
  const { user, loading } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    const checkPaywall = async () => {
      if (!user || loading) return;
      if (location.pathname === "/premium" || location.pathname === "/login" || location.pathname === "/") return;
      
      const show = await shouldShowPaywall({ trigger: 'periodic' });
      if (show) setShowPaywall(true);
    };
    checkPaywall();
  }, [location.pathname, user, loading]);

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

  if (
    !user &&
    location.pathname !== "/login" &&
    location.pathname !== "/" &&
    location.pathname !== "/onboarding"
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
        <Route path="/profile" element={<Profile />} />
        <Route path="/look-alike" element={<LookAlike />} />
        <Route path="/login" element={<Login />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNav && <BottomNav />}
      <PaywallModal 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        onUpgrade={() => { setShowPaywall(false); navigate('/premium'); }} 
      />
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
