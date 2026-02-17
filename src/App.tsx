import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import AuthLogin from "@/pages/AuthLogin";
import AuthSignup from "@/pages/AuthSignup";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function Layout() {
  const location = useLocation();
  const hideNav = ["/", "/onboarding", "/auth/login", "/auth/signup"].includes(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth/login" element={<AuthLogin />} />
        <Route path="/auth/signup" element={<AuthSignup />} />
        <Route path="/analysis" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
        <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/ger-results/:id" element={<ProtectedRoute><GerResults /></ProtectedRoute>} />
        <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
        <Route path="/trends" element={<ProtectedRoute><Trends /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/look-alike" element={<ProtectedRoute><LookAlike /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
