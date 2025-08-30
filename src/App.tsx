import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import Index from "./pages/Index";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Workshop from "./pages/Workshop";
import Login from "./pages/Login";
import TestNotifications from "./pages/TestNotifications";
import NotFound from "./pages/NotFound";
import CategoriesPage from "./pages/categories";
import StockManagement from "./pages/StockManagement.tsx";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NotificationProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/test-notifications" element={<TestNotifications />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/categories" element={<CategoriesPage />} />
            <Route path="/stock-management" element={<StockManagement />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/workshop" element={<Workshop />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
