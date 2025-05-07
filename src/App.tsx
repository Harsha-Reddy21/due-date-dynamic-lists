
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import { AuthProvider } from "./contexts/AuthContext";
import { TaskProvider } from "./contexts/TaskContext";
import AuthRoute from "./components/AuthRoute";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TaskProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<AuthRoute><Index /></AuthRoute>} />
                <Route path="/profile" element={<AuthRoute><Profile /></AuthRoute>} />
                <Route path="/settings" element={<AuthRoute><Settings /></AuthRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </QueryClientProvider>
        </TaskProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
