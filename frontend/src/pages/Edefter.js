import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

function periodOptions() {
  const out = []; const now = new Date();
  for (let i = 0; i < 12; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
  return out;
}
const STEP_LABELS = { kayitlar: "Kayıtlar", kontrol: "Kontrol", berat_olustur: "Berat Oluştur", berat_yukle: "Berat Yükle", berat_onay: "Berat Onay", arsiv: "Arşiv" };

export default function Edefter() {
  const [period, setPeriod] = useState(periodOptions()[0]);
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/edefter", { params: { period } }).then((r) => setData(r.data)); }, [period]);
  if (!data) return <div className="text-muted-foreground">Yükleniyor...</div>;

  const toggle = async (row, step) => {
    const steps = { ...(row.steps || {}), [step]: !row.steps?.[step] };
    setData((d) => ({ ...d, rows: d.rows.map((r) => r.client_id === row.client_id ? { ...r, steps } : r) }));
    await api.post("/edefter/update", { client_id: row.client_id, period, steps });
    toast.success("Güncellendi");
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-head text-3xl font-semibold tracking-tight">e-Defter Takip</h1>
          <p className="text-sm text-muted-foreground mt-1">Berat oluşturma ve yükleme aşamaları. Tüm adımlar tamamlanmayanlar dashboard'da kırmızı uyarı üretir.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48" data-testid="edefter-period"><SelectValue /></SelectTrigger>
          <SelectContent>{periodOptions().map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium min-w-[220px]">Mükellef</th>
                {data.steps.map((s) => <th key={s} className="px-3 py-3 font-medium text-center">{STEP_LABELS[s]}</th>)}
                <th className="px-3 py-3 font-medium text-center">Durum</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const done = data.steps.every((s) => r.steps?.[s]);
                return (
                  <tr key={r.client_id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium">{r.unvan}</td>
                    {data.steps.map((s) => (
                      <td key={s} className="px-3 py-3 text-center"><Checkbox data-testid={`edefter-${r.client_id}-${s}`} checked={!!r.steps?.[s]} onCheckedChange={() => toggle(r, s)} /></td>
                    ))}
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"}`}>{done ? "Tamam" : "Eksik"}</span>
                    </td>
                  </tr>
                );
              })}
              {data.rows.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">e-Defter mükellefi yok</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
