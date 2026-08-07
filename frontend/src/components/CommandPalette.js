import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import api from "@/lib/api";
import { Users, FileCheck, ListChecks, Wallet, Calendar, LayoutDashboard, Building2 } from "lucide-react";

export default function CommandPalette({ open, setOpen }) {
  const nav = useNavigate();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (open && clients.length === 0) api.get("/clients").then((r) => setClients(r.data)).catch(() => {});
  }, [open]);

  const go = (path) => { setOpen(false); nav(path); };
  const actions = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Mükellefler", icon: Users, path: "/mukellefler" },
    { label: "Yeni Mükellef Ekle", icon: Users, path: "/mukellefler?yeni=1" },
    { label: "Beyanname Takip", icon: FileCheck, path: "/beyannameler" },
    { label: "Görevler", icon: ListChecks, path: "/gorevler" },
    { label: "Cari Hesap", icon: Wallet, path: "/cari" },
    { label: "Takvim", icon: Calendar, path: "/takvim" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Mükellef ara veya komut yaz..." data-testid="command-input" />
      <CommandList>
        <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
        <CommandGroup heading="Hızlı İşlemler">
          {actions.map((a) => (
            <CommandItem key={a.path} onSelect={() => go(a.path)}>
              <a.icon size={16} className="mr-2" /> {a.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Mükellefler">
          {clients.slice(0, 30).map((c) => (
            <CommandItem key={c.id} value={c.unvan + c.vkn} onSelect={() => go(`/mukellefler/${c.id}`)}>
              <Building2 size={16} className="mr-2" /> {c.unvan}
              <span className="ml-auto text-xs text-muted-foreground">{c.vkn}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
