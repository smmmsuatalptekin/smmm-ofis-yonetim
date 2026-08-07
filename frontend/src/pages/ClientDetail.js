import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { fmtTL, fmtDate, todayISO, STATUS_COLORS } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, MapPin, Plus, Trash2, Pencil, FileDown, ArrowUpDown } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [cari, setCari] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [txn, setTxn] = useState({ type: "alacak", amount: "", aciklama: "", yontem: "Havale", date: todayISO() });
  const [sortAsc, setSortAsc] = useState(false);
  const [editTxn, setEditTxn] = useState(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfRange, setPdfRange] = useState({ all: true, start: "", end: "" });
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadCari = () => api.get(`/clients/${id}/transactions`).then((r) => setCari(r.data));
  useEffect(() => {
    api.get(`/clients/${id}`).then((r) => setC(r.data));
    loadCari();
    api.get("/tasks", { params: { client_id: id } }).then((r) => setTasks(r.data));
  }, [id]);

  if (!c) return <div className="text-muted-foreground">Yükleniyor...</div>;

  const addTxn = async () => {
    if (!txn.amount) return toast.error("Tutar girin");
    if (!txn.date) return toast.error("İşlem tarihi zorunludur");
    try {
      await api.post("/transactions", { ...txn, client_id: id, amount: Number(txn.amount) });
      toast.success("Cari hareket eklendi");
      setTxn({ type: "alacak", amount: "", aciklama: "", yontem: "Havale", date: todayISO() });
      loadCari();
    } catch (e) { toast.error(e.response?.data?.detail || "Hareket eklenemedi"); }
  };
  const saveEdit = async () => {
    if (!editTxn.amount) return toast.error("Tutar girin");
    if (!editTxn.date) return toast.error("İşlem tarihi zorunludur");
    try {
      await api.put(`/transactions/${editTxn.id}`, {
        client_id: id, type: editTxn.type, amount: Number(editTxn.amount),
        aciklama: editTxn.aciklama, date: editTxn.date,
      });
      toast.success("Hareket güncellendi"); setEditTxn(null); loadCari();
    } catch (e) { toast.error(e.response?.data?.detail || "Güncellenemedi"); }
  };
  const delTxn = async (tid) => {
    try { await api.delete(`/transactions/${tid}`); toast.success("Hareket silindi"); loadCari(); }
    catch (e) { toast.error("Silinemedi"); }
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const params = {};
      if (!pdfRange.all) {
        if (!pdfRange.start || !pdfRange.end) { setPdfLoading(false); return toast.error("Başlangıç ve bitiş tarihi seçin"); }
        params.start = pdfRange.start; params.end = pdfRange.end;
      }
      const res = await api.get(`/clients/${id}/statement/pdf`, { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      const safe = (c.unvan || "Cari").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const rng = pdfRange.all ? "Tum_Hareketler" : `${pdfRange.start}_${pdfRange.end}`;
      a.href = url; a.download = `${safe}_Cari_Ekstre_${rng}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF ekstre indirildi"); setPdfOpen(false);
    } catch (e) { toast.error("PDF oluşturulamadı"); }
    finally { setPdfLoading(false); }
  };

  const sortedTxns = cari ? [...cari.transactions].sort((a, b) => {
    const da = (a.date || a.created_at || "").slice(0, 10);
    const dbb = (b.date || b.created_at || "").slice(0, 10);
    return sortAsc ? da.localeCompare(dbb) : dbb.localeCompare(da);
  }) : [];

  const info = [["Vergi Kimlik No", c.vkn], ["TC Kimlik No", c.tckn], ["Vergi Dairesi", c.vergi_dairesi],
    ["Şirket Türü", c.sirket_turu], ["NACE", c.nace], ["Faaliyet", c.faaliyet], ["Yetkili", c.yetkili],
    ["KEP", c.kep], ["Sorumlu Personel", c.sorumlu_personel], ["Çalışan Sayısı", c.calisan_sayisi]];

  return (
    <div className="space-y-5 fade-in">
      <button onClick={() => nav("/mukellefler")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> Mükellefler</button>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-head text-3xl font-semibold tracking-tight flex items-center gap-3">{c.unvan}
            <Badge variant="secondary">{c.sirket_turu}</Badge>
            {c.edefter && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-0">e-Defter</Badge>}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {c.telefon && <span className="flex items-center gap-1"><Phone size={14} />{c.telefon}</span>}
            {c.email && <span className="flex items-center gap-1"><Mail size={14} />{c.email}</span>}
            {c.adres && <span className="flex items-center gap-1"><MapPin size={14} />{c.adres}</span>}
          </div>
        </div>
        <Card className="px-5 py-3 text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Cari Bakiye</div>
          <div className={`font-head text-2xl font-semibold ${cari && cari.bakiye > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{cari ? fmtTL(cari.bakiye) : "..."}</div>
        </Card>
      </div>

      <Tabs defaultValue="genel">
        <TabsList>
          <TabsTrigger value="genel" data-testid="tab-genel">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="cari" data-testid="tab-cari">Cari Hesap</TabsTrigger>
          <TabsTrigger value="gorevler" data-testid="tab-gorevler">Görevler</TabsTrigger>
          <TabsTrigger value="beyanname" data-testid="tab-beyanname">Beyannameler</TabsTrigger>
        </TabsList>

        <TabsContent value="genel">
          <Card className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            {info.map(([l, v]) => (
              <div key={l}>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{l}</div>
                <div className="text-sm font-medium mt-0.5">{v || "—"}</div>
              </div>
            ))}
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Aylık Ücret</div>
              <div className="text-sm font-medium mt-0.5">{fmtTL(c.aylik_ucret)}</div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Beyanname Türleri</div>
              <div className="flex flex-wrap gap-1.5">{(c.beyanname_turleri || []).map((b) => <Badge key={b} variant="secondary">{b}</Badge>)}</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cari">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Borç (Tahakkuk)</div><div className="font-head text-xl font-semibold mt-1">{cari ? fmtTL(cari.borc) : "..."}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Alacak (Tahsilat)</div><div className="font-head text-xl font-semibold mt-1 text-emerald-600">{cari ? fmtTL(cari.alacak) : "..."}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Bakiye</div><div className="font-head text-xl font-semibold mt-1 text-rose-600">{cari ? fmtTL(cari.bakiye) : "..."}</div></Card>
          </div>
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-head font-medium text-sm">Yeni Cari Hareket</h4>
              <Button variant="outline" size="sm" data-testid="pdf-ekstre-btn" onClick={() => setPdfOpen(true)}>
                <FileDown size={15} className="mr-1.5" /> PDF Ekstre Al
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1"><Label className="text-xs">İşlem Tarihi *</Label>
                <Input data-testid="txn-date" type="date" className="w-40" value={txn.date} onChange={(e) => setTxn({ ...txn, date: e.target.value })} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Tür</Label>
                <Select value={txn.type} onValueChange={(v) => setTxn({ ...txn, type: v })}>
                  <SelectTrigger className="w-32" data-testid="txn-type"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="alacak">Tahsilat</SelectItem><SelectItem value="borc">Tahakkuk/Borç</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Tutar</Label><Input data-testid="txn-amount" type="number" className="w-32" value={txn.amount} onChange={(e) => setTxn({ ...txn, amount: e.target.value })} /></div>
              <div className="space-y-1 flex-1 min-w-[160px]"><Label className="text-xs">Açıklama</Label><Input data-testid="txn-desc" value={txn.aciklama} onChange={(e) => setTxn({ ...txn, aciklama: e.target.value })} /></div>
              <Button data-testid="add-txn-btn" onClick={addTxn}><Plus size={16} className="mr-1" /> Ekle</Button>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr>
                <th className="text-left px-4 py-2.5 font-medium">
                  <button data-testid="sort-date-btn" onClick={() => setSortAsc((s) => !s)} className="inline-flex items-center gap-1 hover:text-foreground">
                    Tarih <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 font-medium">İşlem Türü</th>
                <th className="text-left px-4 py-2.5 font-medium">Açıklama</th>
                <th className="text-right px-4 py-2.5 font-medium">Borç</th><th className="text-right px-4 py-2.5 font-medium">Alacak</th><th className="w-16"></th>
              </tr></thead>
              <tbody>
                {sortedTxns.map((t) => (
                  <tr key={t.id} data-testid={`txn-row-${t.id}`} className="border-t border-border">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(t.date || t.created_at)}</td>
                    <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded ${t.type === "borc" ? "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>{t.type === "borc" ? "Borç/Tahakkuk" : "Tahsilat"}</span></td>
                    <td className="px-4 py-2.5">{t.aciklama}</td>
                    <td className="px-4 py-2.5 text-right">{t.type === "borc" ? fmtTL(t.amount) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{t.type === "alacak" ? fmtTL(t.amount) : "—"}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button data-testid={`txn-edit-${t.id}`} onClick={() => setEditTxn({ id: t.id, type: t.type, amount: t.amount, aciklama: t.aciklama || "", date: (t.date || t.created_at || "").slice(0, 10) })} className="text-muted-foreground hover:text-blue-500"><Pencil size={14} /></button>
                        <button data-testid={`txn-delete-${t.id}`} onClick={() => delTxn(t.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedTxns.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Hareket yok</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="gorevler">
          <Card className="divide-y divide-border">
            {tasks.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Bu mükellefe atanmış görev yok</div>}
            {tasks.map((t) => (
              <div key={t.id} className="p-4 flex items-center gap-3">
                <span className="text-sm flex-1">{t.baslik}</span>
                <span className="text-xs text-muted-foreground">{t.deadline}</span>
                <Badge variant="secondary">{t.status}</Badge>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="beyanname">
          <Card className="p-6"><p className="text-sm text-muted-foreground">Bu mükellefin beyanname takibi <button className="underline" onClick={() => nav("/beyannameler")}>Beyannameler</button> ekranındaki grid üzerinden yürütülür.</p></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editTxn} onOpenChange={(v) => !v && setEditTxn(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cari Hareketi Düzenle</DialogTitle></DialogHeader>
          {editTxn && (
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5"><Label className="text-xs">İşlem Tarihi *</Label>
                <Input data-testid="edit-txn-date" type="date" value={editTxn.date} onChange={(e) => setEditTxn({ ...editTxn, date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Tür</Label>
                <Select value={editTxn.type} onValueChange={(v) => setEditTxn({ ...editTxn, type: v })}>
                  <SelectTrigger data-testid="edit-txn-type"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="alacak">Tahsilat</SelectItem><SelectItem value="borc">Tahakkuk/Borç</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Tutar</Label>
                <Input data-testid="edit-txn-amount" type="number" value={editTxn.amount} onChange={(e) => setEditTxn({ ...editTxn, amount: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-xs">Açıklama</Label>
                <Input data-testid="edit-txn-desc" value={editTxn.aciklama} onChange={(e) => setEditTxn({ ...editTxn, aciklama: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTxn(null)}>İptal</Button>
            <Button data-testid="save-edit-txn-btn" onClick={saveEdit}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>PDF Cari Ekstre</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox data-testid="pdf-all-check" checked={pdfRange.all} onCheckedChange={(v) => setPdfRange({ ...pdfRange, all: !!v })} />
              Tüm Hareketler
            </label>
            {!pdfRange.all && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Başlangıç Tarihi</Label>
                  <Input data-testid="pdf-start" type="date" value={pdfRange.start} onChange={(e) => setPdfRange({ ...pdfRange, start: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Bitiş Tarihi</Label>
                  <Input data-testid="pdf-end" type="date" value={pdfRange.end} onChange={(e) => setPdfRange({ ...pdfRange, end: e.target.value })} /></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfOpen(false)}>İptal</Button>
            <Button data-testid="download-pdf-btn" onClick={downloadPdf} disabled={pdfLoading}>
              <FileDown size={15} className="mr-1.5" /> {pdfLoading ? "Oluşturuluyor..." : "İndir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
