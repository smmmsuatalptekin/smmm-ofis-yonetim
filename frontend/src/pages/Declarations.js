import React, { useEffect, useState, useMemo } from "react";
import api, { STATUS_COLORS } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

function periodOptions() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const label = (p) => `${MONTHS[parseInt(p.slice(5)) - 1]} ${p.slice(0, 4)}`;

export default function Declarations() {
  const [period, setPeriod] = useState(periodOptions()[0]);
  const [data, setData] = useState(null);
  const [statuses, setStatuses] = useState([]);

  const load = () => api.get("/declarations", { params: { period } }).then((r) => { setData(r.data); setStatuses(r.data.statuses); });
  useEffect(() => { load(); }, [period]);

  const usedTypes = useMemo(() => {
    if (!data) return [];
    const s = new Set();
    data.rows.forEach((r) => Object.keys(r.cells).forEach((t) => s.add(t)));
    return data.types.filter((t) => s.has(t));
  }, [data]);

  const setStatus = async (client_id, type, status) => {
    await api.post("/declarations/update", { client_id, type, period, status });
    setData((d) => ({ ...d, rows: d.rows.map((r) => r.client_id === client_id ? { ...r, cells: { ...r.cells, [type]: { ...r.cells[type], status } } } : r) }));
    toast.success("Güncellendi");
  };

  if (!data) return <div className="text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-head text-3xl font-semibold tracking-tight">Beyanname Takip</h1>
          <p className="text-sm text-muted-foreground mt-1">Satırlar mükellef, sütunlar beyanname. Duruma tıklayarak hızlı güncelleyin.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48" data-testid="period-select"><SelectValue /></SelectTrigger>
          <SelectContent>{periodOptions().map((p) => <SelectItem key={p} value={p}>{label(p)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left font-medium px-4 py-3 sticky left-0 bg-secondary/95 backdrop-blur z-10 min-w-[220px]">Mükellef</th>
                {usedTypes.map((t) => <th key={t} className="font-medium px-3 py-3 text-center min-w-[130px]">{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.client_id} data-testid={`decl-row-${r.client_id}`} className="border-t border-border hover:bg-accent/40">
                  <td className="px-4 py-2.5 sticky left-0 bg-card z-10">
                    <div className="font-medium">{r.unvan}</div>
                    <div className="text-xs text-muted-foreground">{r.sorumlu_personel}</div>
                  </td>
                  {usedTypes.map((t) => {
                    const cell = r.cells[t];
                    if (!cell) return <td key={t} className="px-3 py-2.5 text-center text-muted-foreground/30">—</td>;
                    return (
                      <td key={t} className="px-3 py-2.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button data-testid={`decl-cell-${r.client_id}-${t}`} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border ${STATUS_COLORS[cell.status] || "bg-secondary"}`}>
                              {cell.status} <ChevronDown size={12} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center">
                            {statuses.map((s) => <DropdownMenuItem key={s} onClick={() => setStatus(r.client_id, t, s)}>{s}</DropdownMenuItem>)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
