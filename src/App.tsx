import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import AuthGuard from "@/components/AuthGuard";
import LoginPage from "@/pages/LoginPage";
import DealsPage from "@/pages/DealsPage";
import DealDetailPage from "@/pages/DealDetailPage";
import AnalysisPage from "@/pages/AnalysisPage";
import SettingsPage from "@/pages/SettingsPage";
import ExtensionPage from "@/pages/ExtensionPage";
import CompsPage from "@/pages/CompsPage";
import NotFound from "@/pages/NotFound";

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/deals" replace />} />
        <Route path="/deals" element={<AuthGuard><DealsPage /></AuthGuard>} />
        <Route path="/deals/:id" element={<AuthGuard><DealDetailPage /></AuthGuard>} />
        <Route path="/analysis" element={<AuthGuard><AnalysisPage /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path="/extension" element={<AuthGuard><ExtensionPage /></AuthGuard>} />
        <Route path="/comps" element={<AuthGuard><CompsPage /></AuthGuard>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;
