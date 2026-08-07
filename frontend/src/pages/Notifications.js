import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

const CFG = {
  kritik: { icon: AlertCircle, cls: "text-rose-600 bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400", label: "Kritik" },
  uyari: { icon: AlertTriangle, cls: "text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400", label: "Uyarı" },
  bilgi: { icon: Info, cls: "text-blue-600 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400", label: "Bilgi" },
};

export default function Notifications() {
  const [notes, setNotes] = useState(null);
  useEffect(() => { api.get("/notifications").then((r) => setNotes(r.data)); }, []);
  if (!notes) return <div className="text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-5 fade-in">
      <div><h1 className="font-head text-3xl font-semibold tracking-tight">Bildirim Merkezi</h1>
      <p className="text-sm text-muted-foreground mt-1">{notes.length} aktif bildirim</p></div>
      <div className="space-y-2">
        {notes.map((n, i) => {
          const c = CFG[n.level] || CFG.bilgi; const Icon = c.icon;
          return (
            <Card key={i} data-testid={`notif-${i}`} className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg grid place-items-center ${c.cls}`}><Icon size={18} /></div>
              <div className="flex-1 text-sm">{n.text}</div>
              <span className={`text-xs px-2 py-0.5 rounded ${c.cls}`}>{c.label}</span>
            </Card>
          );
        })}
        {notes.length === 0 && <Card className="p-10 text-center text-muted-foreground">Bildirim yok. Her şey yolunda!</Card>}
      </div>
    </div>
  );
}
