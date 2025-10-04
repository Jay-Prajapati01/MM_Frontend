import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Houses from "./pages/Houses";
import Members from "./pages/Members";
import Vehicles from "./pages/Vehicles";
import Maintenance from "./pages/Maintenance";
import Expenditures from "./pages/Expenditures";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const App = () => (
  <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/houses" element={<Houses />} />
            <Route path="/members" element={<Members />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/expenditures" element={<Expenditures />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
);

export default App;
