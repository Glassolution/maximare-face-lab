import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Analysis from "@/pages/Analysis";
import Results from "@/pages/Results";
import Recommendations from "@/pages/Recommendations";
import ProgressPage from "@/pages/Progress";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function Layout() {
  const location = useLocation();
  const isLanding = location.pathname === "/" || location.pathname === "/onboarding";

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isLanding && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
