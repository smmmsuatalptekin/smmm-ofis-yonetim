import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, FileCheck, BookOpen, Mail, Briefcase, ListChecks,
  Wallet, Receipt, FolderArchive, Calendar, BarChart3, Bell, UserCog,
  Settings, Moon, Sun, LogOut, Search, ScrollText, Bot, Menu
} from "lucide-react";
import CommandPalette from "@/components/CommandPalette";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/mukellefler", label: "Mükellefler", icon: Users },
  { to: "/beyannameler", label: "Beyannameler", icon: FileCheck },
  { to: "/edefter", label: "e-Defter", icon: BookOpen },
  { to: "/etebligat", label: "e-Tebligat", icon: Mail },
  { to: "/gorevler", label: "Görevler", icon: ListChecks },
  { to: "/cari", label: "Cari Hesap", icon: Wallet },
  { to: "/tahsilatlar", label: "Tahsilatlar", icon: Receipt },
  { to: "/takvim", label: "Takvim", icon: Calendar },
  { to: "/raporlar", label: "Raporlar", icon: BarChart3 },
  { to: "/bildirimler", label: "Bildirimler", icon: Bell },
  { to: "/asistan", label: "Akıllı Asistan", icon: Bot },
  { to: "/personel", label: "Personel", icon: UserCog },
  { to: "/audit", label: "İşlem Kayıtları", icon: ScrollText },
  { to: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export default function Layout({ children }) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const Sidebar = (
    <aside className="w-64 flex flex-col h-full bg-card border-r border-border">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-head font-bold">S</div>
        <div className="leading-tight">
          <div className="font-head font-semibold text-sm">SMMM Ofis</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Yönetim Sistemi</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMobileOpen(false)}
            data-testid={`nav-${n.label.toLowerCase().replace(/\s|ı/g, "-")}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`
            }>
            <n.icon size={18} strokeWidth={1.8} /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-accent grid place-items-center text-xs font-semibold">{(user?.name || "?").slice(0, 2)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.name}</div>
            <div className="text-[10px] text-muted-foreground truncate">{user?.role}</div>
          </div>
          <button data-testid="logout-btn" onClick={() => { logout(); nav("/login"); }} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">{Sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{Sidebar}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between gap-4">
          <button className="lg:hidden p-2 rounded-md hover:bg-accent" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <button data-testid="open-command-palette" onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary border border-border rounded-lg px-3 py-2 w-full max-w-md hover:bg-accent transition-colors">
            <Search size={16} /> <span className="flex-1 text-left">Ara veya komut... </span>
            <kbd className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
          <button data-testid="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </div>
  );
}
