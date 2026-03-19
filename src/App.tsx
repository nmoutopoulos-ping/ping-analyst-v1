import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import AuthGuard from "@/components/AuthGuard";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DealsPage from "@/pages/DealsPage";
import DealDetailPage from "@/pages/DealDetailPage";
import AnalysisPage from "@/pages/AnalysisPage";
import SettingsPage from "@/pages/SettingsPage";
import ExtensionPage from "@/pages/ExtensionPage";
import ProfilePage from "@/pages/ProfilePage";
import CompsPage from "@/pages/CompsPage";
import NotFound from "@/pages/NotFound";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/deals" replace />} />
        <Route path="/deals" element={<ProtectedRoute><DealsPage /></ProtectedRoute>} />
        <Route path="/deals/:id" element={<ProtectedRoute><DealDetailPage /></ProtectedRoute>} />
        <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/extension" element={<ProtectedRoute><ExtensionPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/comps" element={<ProtectedRoute><CompsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;
