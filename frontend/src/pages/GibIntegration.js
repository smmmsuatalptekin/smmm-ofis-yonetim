import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Landmark, ShieldCheck, PlugZap } from "lucide-react";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const BADGE = {
  "Onaylandı": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "Onay Bekliyor": "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  "Hatalı": "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  "Taslak": "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  "Bulunamadı": "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  "İptal Edildi": "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-400",
  "Kopyalanıyor": "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  "Silindi": "bg-neutral-200 text-neutral-600 dark:bg-neutral-500/10 dark:text-neutral-400",
  "Sorgu Hatası": "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  "Bilinmeyen Durum": "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  "Eşleştirilemedi": "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
};

export default function GibIntegration() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const period = `${year}-${String(month).padStart(2, "0")}`;

  const loadCache = () => api.get("/gib/results", { params: { period } }).then((r) => setData(r.data)).catch((e) => {
    if (e.response?.status === 403) toast.error("GİB Entegrasyon için yetkiniz yok");
  });
  useEffect(() => { loadCache(); }, [period]);

  const query = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/gib/query", { year: Number(year), month: Number(month) });
      setData(data); toast.success(`GİB sorgusu tamamlandı (${data.queried} kayıt)`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "GİB sorgusu başarısız");
    } finally { setLoading(false); }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/gib/test-connection", {});
      if (data.mock) toast.info(data.message);
      else toast.success(data.message);
    } catch (e) {
      toast.error(e.response?.data?.detail || "GİB bağlantı testi başarısız");
    } finally { setTesting(false); }
  };

  const isMock = data?.mock !== false;

  const s = data?.summary || {};
  const rows = data?.rows || [];
  const fmtDT = (iso) => iso ? new Date(iso).toLocaleString("tr-TR") : "Henüz sorgulanmadı";

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-head text-3xl font-semibold tracking-tight flex items-center gap-2"><Landmark size={26} /> GİB Entegrasyon</h1>
          <p className="text-sm text-muted-foreground mt-1">Yeni e-Beyan · salt okunur durum sorgulama</p>
        </div>
        <div className="flex items-end gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28" data-testid="gib-year"><SelectValue /></SelectTrigger>
            <SelectContent>{[0,1,2,3].map((i)=>String(now.getFullYear()-i)).map((y)=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-32" data-testid="gib-month"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m,i)=><SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Button data-testid="gib-test-btn" variant="outline" onClick={testConnection} disabled={testing}>
            <PlugZap size={15} className="mr-1.5" /> {testing ? "Test ediliyor..." : "Bağlantıyı Test Et"}
          </Button>
          <Button data-testid="gib-query-btn" onClick={query} disabled={loading}>
            <RefreshCw size={15} className={`mr-1.5 ${loading?"animate-spin":""}`} /> {loading ? "Sorgulanıyor..." : (data?.last_checked_at ? "GİB'den Yenile" : "GİB'den Sorgula")}
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5" data-testid="gib-mode-badge">
          <ShieldCheck size={15} className={isMock ? "text-amber-600" : "text-emerald-600"} /> Mod:
          <b className={`px-2 py-0.5 rounded text-xs ${isMock ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
            {isMock ? "MOCK MOD" : "GERÇEK GİB"}
          </b>
        </span>
        <span className="text-muted-foreground">Son sorgu: <b className="text-foreground">{fmtDT(data?.last_checked_at)}</b></span>
        <span className="text-muted-foreground">Sorgulanan mükellef: <b className="text-foreground">{data?.client_count ?? rows.filter(r=>r.matched).length}</b></span>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {["Onaylandı","Onay Bekliyor","Hatalı","Taslak","Bulunamadı","Eşleştirilemedi"].map((k)=>(
          <Card key={k} className="p-4" data-testid={`gib-kpi-${k}`}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className="font-head text-2xl font-semibold mt-1">{s[k] || 0}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-4 py-2.5 font-medium">Mükellef</th>
              <th className="text-left px-4 py-2.5 font-medium">VKN/TCKN</th>
              <th className="text-left px-4 py-2.5 font-medium">Beyanname Türü</th>
              <th className="text-left px-4 py-2.5 font-medium">Dönem</th>
              <th className="text-left px-4 py-2.5 font-medium">GİB Durumu</th>
              <th className="text-left px-4 py-2.5 font-medium">Beyanname No</th>
            </tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} data-testid={`gib-row-${i}`} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">{r.unvan}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.vkn || r.tckn || "—"}</td>
                  <td className="px-4 py-2.5">{r.app_type || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.period}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded ${BADGE[r.status]||"bg-secondary"}`}>{r.status === "Bulunamadı" ? "GİB'de kayıt bulunamadı" : r.status}</span></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.declaration_no || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Bu dönem için sonuç yok. "GİB'den Sorgula" ile başlatın.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {isMock
        ? <p className="text-xs text-muted-foreground" data-testid="gib-mock-note">Not: Sonuçlar <b>MOCK</b> verilerdir. Gerçek GİB entegrasyonu için backend ortam değişkenleri ile <code>GIB_MOCK_MODE=false</code>, <code>GIB_API_BASE_URL</code>, <code>GIB_API_TOKEN</code>, <code>GIB_INTEGRATOR_IDENTITY</code> yapılandırılır (salt-okunur eBeyanname Kullanıcı REST API).</p>
        : <p className="text-xs text-muted-foreground" data-testid="gib-real-note">Bağlantı <b>GERÇEK GİB</b> (eBeyanname Kullanıcı REST API) üzerinden salt-okunur olarak yapılır.</p>}
    </div>
  );
}
