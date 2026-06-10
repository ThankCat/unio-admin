import { LoginPage } from "@/pages/LoginPage";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProvidersPage } from "@/pages/ProvidersPage";
import { ChannelsPage } from "@/pages/ChannelsPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { Routes, Route, Navigate } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="channels" element={<ChannelsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
