import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { activatePhiOnStartup } from "@/ai/aiEngine";
import { useStore } from "@/stores/useStore";
import Index from "./pages/Index.tsx";
import Welcome from "./pages/Welcome.tsx";
import NotFound from "./pages/NotFound.tsx";

const App = () => {
  const initializeApp = useStore((s) => s.initializeApp);

  useEffect(() => {
    initializeApp().catch((error) => {
      console.error("Failed to initialize app", error);
    });
  }, [initializeApp]);

  useEffect(() => {
    activatePhiOnStartup().catch((error) => {
      console.error("Failed to auto-activate Phi model", error);
    });
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/workspace/:projectId" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
