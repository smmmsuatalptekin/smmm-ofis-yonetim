import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ACTION_LABELS = { create: "Oluşturma", update: "Güncelleme", delete: "Silme", accrual: "Tahakkuk", bulk_update: "Toplu Güncelleme" };

export default function Audit() {
  const [logs, setLogs] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api.get("/audit").then((r) => setLogs(r.data)).catch((e) => setErr(e.response?.data?.detail || "Yetkiniz yok")); }, []);
  if (err) return <div className="fade-in"><h1 className="font-head text-3xl font-semibold tracking-tight mb-4">İşlem Kayıtları</h1><Card className="p-10 text-center text-muted-foreground">{err}</Card></div>;
  if (!logs) return <div className="text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-5 fade-in">
      <div><h1 className="font-head text-3xl font-semibold tracking-tight">İşlem Kayıtları (Audit Log)</h1>
      <p className="text-sm text-muted-foreground mt-1">Kritik işlemlerin değiştirilemez kaydı</p></div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr>
            <th className="text-left px-4 py-3 font-medium">Tarih</th><th className="text-left px-4 py-3 font-medium">Kullanıcı</th>
            <th className="text-left px-4 py-3 font-medium">İşlem</th><th className="text-left px-4 py-3 font-medium">Varlık</th><th className="text-left px-4 py-3 font-medium">Detay</th>
          </tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(l.created_at).toLocaleString("tr-TR")}</td>
                <td className="px-4 py-2.5">{l.user_name}</td>
                <td className="px-4 py-2.5"><Badge variant="secondary">{ACTION_LABELS[l.action] || l.action}</Badge></td>
                <td className="px-4 py-2.5 text-muted-foreground">{l.entity}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{l.detail || "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Kayıt yok</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
