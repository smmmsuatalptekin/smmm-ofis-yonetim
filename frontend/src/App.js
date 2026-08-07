import "@/App.css";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Declarations from "@/pages/Declarations";
import Edefter from "@/pages/Edefter";
import Tasks from "@/pages/Tasks";
import Cari from "@/pages/Cari";
import Calendar from "@/pages/Calendar";
import Notifications from "@/pages/Notifications";
import Assistant from "@/pages/Assistant";
import Reports from "@/pages/Reports";
import Personel from "@/pages/Personel";
import Audit from "@/pages/Audit";
import Placeholder from "@/pages/Placeholder";

function Protected({ children }) {
  const { user, checked } = useAuth();
  if (!checked) return <div className="h-screen grid place-items-center text-muted-foreground">Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/mukellefler" element={<Protected><Clients /></Protected>} />
      <Route path="/mukellefler/:id" element={<Protected><ClientDetail /></Protected>} />
      <Route path="/beyannameler" element={<Protected><Declarations /></Protected>} />
      <Route path="/edefter" element={<Protected><Edefter /></Protected>} />
      <Route path="/etebligat" element={<Protected><Placeholder title="e-Tebligat" desc="e-Tebligat takip modülü Faz 2'de resmi connector mimarisi ile eklenecektir." /></Protected>} />
      <Route path="/gorevler" element={<Protected><Tasks /></Protected>} />
      <Route path="/cari" element={<Protected><Cari /></Protected>} />
      <Route path="/tahsilatlar" element={<Protected><Cari collectionsMode /></Protected>} />
      <Route path="/takvim" element={<Protected><Calendar /></Protected>} />
      <Route path="/raporlar" element={<Protected><Reports /></Protected>} />
      <Route path="/bildirimler" element={<Protected><Notifications /></Protected>} />
      <Route path="/asistan" element={<Protected><Assistant /></Protected>} />
      <Route path="/personel" element={<Protected><Personel /></Protected>} />
      <Route path="/audit" element={<Protected><Audit /></Protected>} />
      <Route path="/ayarlar" element={<Protected><Placeholder title="Ayarlar" desc="Ofis ayarları, son tarih kuralları ve tema tercihleri." /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
