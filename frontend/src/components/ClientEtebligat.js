import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KeyRound, RefreshCw, Trash2, FileText } from "lucide-react";

const STATUS_MSG = {
  BASARILI: { t: "Başarılı", c: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
  GIRIS_BASARISIZ: { t: "Giriş Başarısız", c: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" },
  MANUEL_DOGRULAMA_GEREKLI: { t: "Manuel Doğrulama Gerekli", c: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  SISTEM_ULASILAMIYOR: { t: "Sisteme Ulaşılamıyor", c: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" },
  SAYFA_YAPISI_DEGISTI: { t: "Sayfa Yapısı Değişti", c: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" },
  KAYIT_BULUNAMADI: { t: "Kayıt Bulunamadı", c: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
};

export default function ClientEtebligat({ clientId }) {
  const [cred, setCred] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kullanici_kodu: "", parola: "", sifre: "" });

  const loadAll = () => {
    api.get(`/clients/${clientId}/dvd-credentials`).then((r) => setCred(r.data)).catch(() => {});
    api.get(`/clients/${clientId}/etebligat`).then((r) => setRecords(r.data)).catch(() => {});
  };
  useEffect(() => { loadAll(); }, [clientId]);

  const saveCred = async () => {
    const payload = {};
    ["kullanici_kodu", "parola", "sifre"].forEach((k) => { if (form[k]) payload[k] = form[k]; });
    if (!Object.keys(payload).length) return toast.error("En az bir alan girin");
    try {
      const { data } = await api.put(`/clients/${clientId}/dvd-credentials`, payload);
      setCred(data); setOpen(false); setForm({ kullanici_kodu: "", parola: "", sifre: "" });
      toast.success("Erişim bilgileri şifrelenerek kaydedildi");
    } catch (e) { toast.error(e.response?.data?.detail || "Kaydedilemedi"); }
  };
  const delCred = async () => {
    try { await api.delete(`/clients/${clientId}/dvd-credentials`); toast.success("Erişim bilgileri silindi"); loadAll(); }
    catch (e) { toast.error("Silinemedi"); }
  };
  const check = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/clients/${clientId}/etebligat/check`, {});
      setLastResult(data);
      if (data.status === "BASARILI") toast.success(`Kontrol tamam · ${data.new_count} yeni tebligat`);
      else toast.message(data.message || STATUS_MSG[data.status]?.t || data.status);
      loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Kontrol başarısız"); }
    finally { setLoading(false); }
  };
  const dl = (eid) => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/clients/${clientId}/etebligat/${eid}/document?inline=1`, "_blank");

  const saved = cred?.status === "Kayıtlı";
  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2 text-sm">
          <KeyRound size={16} className={saved ? "text-emerald-600" : "text-muted-foreground"} />
          Dijital Vergi Dairesi Erişimi:
          <Badge data-testid="dvd-cred-status" variant={saved ? "default" : "secondary"}>{cred?.status || "—"}</Badge>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button data-testid="dvd-cred-btn" size="sm" variant="outline" onClick={() => setOpen(true)}>
            <KeyRound size={14} className="mr-1.5" />{saved ? "Bilgileri Güncelle" : "Erişim Bilgilerini Gir"}
          </Button>
          {saved && <Button data-testid="dvd-cred-del" size="sm" variant="ghost" onClick={delCred}><Trash2 size={14} /></Button>}
          <Button data-testid="etebligat-check-btn" size="sm" onClick={check} disabled={loading}>
            <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />e-Tebligatları Kontrol Et
          </Button>
        </div>
      </Card>

      {lastResult && (
        <div data-testid="etebligat-result" className={`text-sm px-3 py-2 rounded-lg ${STATUS_MSG[lastResult.status]?.c || "bg-secondary"}`}>
          <b>{STATUS_MSG[lastResult.status]?.t || lastResult.status}</b> — {lastResult.message}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-3 py-2.5">Belge No</th>
              <th className="text-left px-3 py-2.5">Tür</th>
              <th className="text-left px-3 py-2.5">Gönderen</th>
              <th className="text-left px-3 py-2.5">Konu</th>
              <th className="text-left px-3 py-2.5">Tebliğ Tarihi</th>
              <th className="text-left px-3 py-2.5">Okunma</th>
              <th className="text-left px-3 py-2.5">Belge</th>
            </tr></thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} data-testid={`etebligat-row-${i}`} className="border-t border-border">
                  <td className="px-3 py-2.5">{r.belge_no || "—"}</td>
                  <td className="px-3 py-2.5">{r.belge_turu || "—"}</td>
                  <td className="px-3 py-2.5">{r.gonderen || "—"}</td>
                  <td className="px-3 py-2.5">{r.konu || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.teblig_tarihi || "—"}</td>
                  <td className="px-3 py-2.5"><Badge variant="secondary">{r.okunma_durumu || "—"}</Badge></td>
                  <td className="px-3 py-2.5">{r.pdf_document_id
                    ? <Button size="sm" variant="ghost" data-testid={`etebligat-pdf-${i}`} onClick={() => dl(r.id)}><FileText size={14} className="mr-1" />PDF</Button>
                    : "—"}</td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Kayıt yok. "e-Tebligatları Kontrol Et" ile senkronize edin.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Dijital Vergi Dairesi Erişimi</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Bilgiler şifrelenerek saklanır ve hiçbir zaman geri gösterilmez. Yalnızca güncellemek istediğiniz alanları doldurun.</p>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Kullanıcı Kodu</Label><Input data-testid="dvd-kullanici-kodu" value={form.kullanici_kodu} onChange={(e) => setForm({ ...form, kullanici_kodu: e.target.value })} autoComplete="off" /></div>
            <div className="space-y-1"><Label className="text-xs">Parola</Label><Input data-testid="dvd-parola" type="password" value={form.parola} onChange={(e) => setForm({ ...form, parola: e.target.value })} autoComplete="new-password" /></div>
            <div className="space-y-1"><Label className="text-xs">Şifre</Label><Input data-testid="dvd-sifre" type="password" value={form.sifre} onChange={(e) => setForm({ ...form, sifre: e.target.value })} autoComplete="new-password" /></div>
          </div>
          <DialogFooter><Button data-testid="dvd-cred-save" onClick={saveCred}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
