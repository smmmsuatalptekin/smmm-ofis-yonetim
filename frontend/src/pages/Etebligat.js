import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Mail, RefreshCw, ShieldCheck } from "lucide-react";

export default function Etebligat() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [sel, setSel] = useState({});
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get("/etebligat/overview").then((r) => setData(r.data)).catch((e) => {
      if (e.response?.status === 403) toast.error("e-Tebligat için yetkiniz yok");
    });
  };
  useEffect(() => { load(); }, []);

  const clients = data?.clients || [];
  const selectedIds = Object.keys(sel).filter((k) => sel[k]);

  const checkSelected = async () => {
    if (!selectedIds.length) return toast.error("Mükellef seçin");
    setLoading(true);
    try {
      const { data: res } = await api.post("/etebligat/check", { client_ids: selectedIds });
      const totalNew = res.results.reduce((a, r) => a + (r.new_count || 0), 0);
      toast.success(`${res.results.length} mükellef kontrol edildi · ${totalNew} yeni tebligat`);
      load(); setSel({});
    } catch (e) { toast.error(e.response?.data?.detail || "Kontrol başarısız"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-head text-3xl font-semibold tracking-tight flex items-center gap-2"><Mail size={26} /> e-Tebligat</h1>
          <p className="text-sm text-muted-foreground mt-1">Dijital Vergi Dairesi · salt okunur tebligat senkronizasyonu</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm" data-testid="etebligat-mode-badge">
            <ShieldCheck size={15} className={data?.mock ? "text-amber-600" : "text-emerald-600"} />
            <b className={`px-2 py-0.5 rounded text-xs ${data?.mock ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
              {data?.mock ? "MOCK MOD" : "GERÇEK DVD"}
            </b>
          </span>
          <Button data-testid="etebligat-bulk-check" onClick={checkSelected} disabled={loading || !selectedIds.length}>
            <RefreshCw size={15} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />Seçili Mükellefleri Kontrol Et ({selectedIds.length})
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr>
              <th className="px-3 py-2.5 w-10"></th>
              <th className="text-left px-3 py-2.5">Mükellef</th>
              <th className="text-left px-3 py-2.5">VKN/TCKN</th>
              <th className="text-left px-3 py-2.5">Erişim</th>
              <th className="text-left px-3 py-2.5">Tebligat Sayısı</th>
              <th className="px-3 py-2.5"></th>
            </tr></thead>
            <tbody>
              {clients.map((c, i) => (
                <tr key={c.id} data-testid={`etebligat-client-${i}`} className="border-t border-border">
                  <td className="px-3 py-2.5"><Checkbox data-testid={`etebligat-select-${i}`} checked={!!sel[c.id]} onCheckedChange={(v) => setSel({ ...sel, [c.id]: !!v })} /></td>
                  <td className="px-3 py-2.5 font-medium">{c.unvan}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.vkn || c.tckn || "—"}</td>
                  <td className="px-3 py-2.5"><Badge variant={c.cred_status === "Kayıtlı" ? "default" : "secondary"}>{c.cred_status}</Badge></td>
                  <td className="px-3 py-2.5">{c.etebligat_count}</td>
                  <td className="px-3 py-2.5 text-right"><Button size="sm" variant="ghost" onClick={() => nav(`/mukellefler/${c.id}`)}>Detay</Button></td>
                </tr>
              ))}
              {clients.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Aktif mükellef yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">Not: İlk sürümde otomatik zamanlayıcı yoktur; kontroller manuel tetiklenir.{data?.mock ? " Sonuçlar MOCK verilerdir." : ""}</p>
    </div>
  );
}
