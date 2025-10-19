import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Pantry from "./pages/Pantry";
import MiPlan from "./pages/MiPlan";
import Listas from "./pages/Listas";
import Recetas from "./pages/Recetas";
import TestPreferencias from "./pages/TestPreferencias";
import EditPreferencias from "./pages/EditPreferencias";
import ComprarIngrediente from "./pages/ComprarIngrediente";
import ComprarLista from "./pages/ComprarLista";
import DeliveryOrder from "./pages/DeliveryOrder";
import ImportPrices from "./pages/ImportPrices";
import Calendar from "./pages/Calendar";
import PaymentMethods from "./pages/PaymentMethods";
import NotFound from "./pages/NotFound";

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/mi-plan" element={<MiPlan />} />
            <Route path="/listas" element={<Listas />} />
            <Route path="/recetas" element={<Recetas />} />
            <Route path="/comprar-ingrediente" element={<ComprarIngrediente />} />
            <Route path="/comprar-lista" element={<ComprarLista />} />
            <Route path="/delivery-order" element={<DeliveryOrder />} />
            <Route path="/import-prices" element={<ImportPrices />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/test-preferencias" element={<TestPreferencias />} />
            <Route path="/editar-preferencias" element={<EditPreferencias />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
