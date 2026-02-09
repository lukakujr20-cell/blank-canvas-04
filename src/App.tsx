// App entry point
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import StockEntry from "./pages/StockEntry";
import AuditHistory from "./pages/AuditHistory";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import ShoppingList from "./pages/ShoppingList";
import Dishes from "./pages/Dishes";
import DiningRoom from "./pages/DiningRoom";
import ClientManagement from "./pages/ClientManagement";
import KitchenPanel from "./pages/KitchenPanel";
import ExportData from "./pages/ExportData";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/auth" replace />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/stock-entry" element={<StockEntry />} />
                  <Route path="/audit-history" element={<AuditHistory />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/shopping-list" element={<ShoppingList />} />
                  <Route path="/dishes" element={<Dishes />} />
                  <Route path="/dining-room" element={<DiningRoom />} />
                  <Route path="/clients" element={<ClientManagement />} />
                  <Route path="/kitchen" element={<KitchenPanel />} />
                  <Route path="/export-data" element={<ExportData />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
