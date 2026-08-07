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
import ClientDocuments from "@/components/ClientDocuments";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, MapPin, Plus, Trash2, Pencil, FileDown, ArrowUpDown, FileText, FileSpreadsheet, Search, Wallet, X } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [cari, setCari] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [txn, setTxn] = useState({ type: "alacak", amount: "", aciklama: "", yontem: "Havale", date: todayISO() });
  const [sortAsc, setSortAsc] = useState(false);
  const [editTxn, setEditTxn] = useState(null);
  const [range, setRange] = useState({ start: "", end: "" });
  const [applied, setApplied] = useState(false);
  const [search, setSearch] = useState("");
  const [openOB, setOpenOB] = useState(false);
  const [ob, setOB] = useState({ date: todayISO(), direction: "borc", amount: "", aciklama: "" });

  const loadCari = (r) => {
    const params = (r && r.start && r.end) ? { start: r.start, end: r.end } : {};
    return api.get(`/clients/${id}/transactions`, { params }).then((res) => setCari(res.data));
  };
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
      loadCari(applied ? range : undefined);
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
      toast.success("Hareket güncellendi"); setEditTxn(null); loadCari(applied ? range : undefined);
    } catch (e) { toast.error(e.response?.data?.detail || "Güncellenemedi"); }
  };
  const delTxn = async (tid) => {
    try { await api.delete(`/transactions/${tid}`); toast.success("Hareket silindi"); loadCari(applied ? range : undefined); }
    catch (e) { toast.error("Silinemedi"); }
  };

  const downloadFile = async (fmt) => {
    const params = {};
    if (applied && range.start && range.end) { params.start = range.start; params.end = range.end; }
    const mime = fmt === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
    try {
      const res = await api.get(`/clients/${id}/statement/${fmt}`, { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement("a");
      const safe = (c.unvan || "Cari").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const rng = (applied && range.start) ? `${range.start}_${range.end}` : "Tum_Hareketler";
      a.href = url; a.download = `${safe}_Cari_Ekstre_${rng}.${fmt}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${fmt.toUpperCase()} ekstre indirildi`);
    } catch (e) { toast.error("Ekstre oluşturulamadı"); }
  };

  const quick = (k) => {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (k === "all") { setRange({ start: "", end: "" }); setApplied(false); loadCari(); return; }
    let s, e;
    if (k === "thisMonth") { s = iso(new Date(y, m, 1)); e = iso(new Date(y, m + 1, 0)); }
    else if (k === "lastMonth") { s = iso(new Date(y, m - 1, 1)); e = iso(new Date(y, m, 0)); }
    else if (k === "thisYear") { s = `${y}-01-01`; e = `${y}-12-31`; }
    else { s = `${y - 1}-01-01`; e = `${y - 1}-12-31`; }
    const nr = { start: s, end: e }; setRange(nr); setApplied(true); loadCari(nr);
  };

  const saveOpening = async (force = false) => {
    if (!ob.amount) return toast.error("Tutar girin");
    try {
      await api.post(`/clients/${id}/opening-balance`, { ...ob, amount: Number(ob.amount), force });
      toast.success("Açılış / devir bakiyesi kaydedildi"); setOpenOB(false);
      loadCari(applied ? range : undefined);
    } catch (e) {
      if (e.response?.status === 409) {
        if (window.confirm("Bu mükellef için zaten bir açılış bakiyesi var. Değiştirilsin mi?")) return saveOpening(true);
      } else toast.error(e.response?.data?.detail || "Kaydedilemedi");
    }
  };

  const visibleTxns = (cari?.transactions || [])
    .filter((t) => {
      if (!search) return true;
      const lbl = t.kind === "acilis" ? "devir açılış bakiyesi" : (t.type === "borc" ? "borç tahakkuk" : "tahsilat");
      const s = search.toLowerCase();
      return (t.aciklama || "").toLowerCase().includes(s) || lbl.includes(s);
    })
    .sort((a, b) => {
      const da = (a.date || a.created_at || "").slice(0, 10), dbb = (b.date || b.created_at || "").slice(0, 10);
      return sortAsc ? da.localeCompare(dbb) : dbb.localeCompare(da);
    });

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
          <TabsTrigger value="evraklar" data-testid="tab-evraklar">Evraklar</TabsTrigger>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {applied ? (<>
              <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Dönem Başı</div><div className="font-head text-xl font-semibold mt-1">{cari ? fmtTL(cari.opening_balance) : "..."}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Dönem Borç</div><div className="font-head text-xl font-semibold mt-1">{cari ? fmtTL(cari.period_borc) : "..."}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Dönem Alacak</div><div className="font-head text-xl font-semibold mt-1 text-emerald-600">{cari ? fmtTL(cari.period_alacak) : "..."}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Dönem Sonu</div><div className="font-head text-xl font-semibold mt-1 text-rose-600">{cari ? fmtTL(cari.period_end_balance) : "..."}</div></Card>
            </>) : (<>
              <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Borç (Tahakkuk)</div><div className="font-head text-xl font-semibold mt-1">{cari ? fmtTL(cari.borc) : "..."}</div></Card>
              <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Alacak (Tahsilat)</div><div className="font-head text-xl font-semibold mt-1 text-emerald-600">{cari ? fmtTL(cari.alacak) : "..."}</div></Card>
              <Card className="p-4 lg:col-span-2"><div className="text-xs text-muted-foreground uppercase">Bakiye</div><div className="font-head text-xl font-semibold mt-1 text-rose-600">{cari ? fmtTL(cari.bakiye) : "..."}</div></Card>
            </>)}
          </div>

          <Card className="p-4 mb-4 space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1"><Label className="text-xs">Başlangıç</Label><Input data-testid="cari-start" type="date" className="w-36" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Bitiş</Label><Input data-testid="cari-end" type="date" className="w-36" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} /></div>
              <Button data-testid="cari-filter-btn" variant="secondary" onClick={() => { if (!range.start || !range.end) return toast.error("Tarih aralığı seçin"); setApplied(true); loadCari(range); }}>Filtrele</Button>
              {applied && <Button data-testid="cari-clear-btn" variant="ghost" onClick={() => { setRange({ start: "", end: "" }); setApplied(false); loadCari(); }}><X size={14} className="mr-1" />Temizle</Button>}
              <div className="relative flex-1 min-w-[160px]"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input data-testid="cari-search" className="pl-8" placeholder="Açıklama/işlem türü ara..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <Button variant="outline" size="sm" data-testid="ob-btn" onClick={() => setOpenOB(true)}><Wallet size={15} className="mr-1.5" />Açılış Bakiyesi</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" data-testid="ekstre-btn"><FileDown size={15} className="mr-1.5" />Ekstre Al</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem data-testid="export-pdf" onClick={() => downloadFile("pdf")}><FileText size={14} className="mr-2" />PDF</DropdownMenuItem>
                  <DropdownMenuItem data-testid="export-xlsx" onClick={() => downloadFile("xlsx")}><FileSpreadsheet size={14} className="mr-2" />Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[["thisMonth", "Bu Ay"], ["lastMonth", "Geçen Ay"], ["thisYear", "Bu Yıl"], ["lastYear", "Geçen Yıl"], ["all", "Tüm Hareketler"]].map(([k, l]) => (
                <button key={k} data-testid={`quick-${k}`} onClick={() => quick(k)} className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-accent transition-colors">{l}</button>
              ))}
            </div>
          </Card>

          <Card className="p-4 mb-4">
            <h4 className="font-head font-medium text-sm mb-3">Yeni Cari Hareket</h4>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1"><Label className="text-xs">İşlem Tarihi *</Label><Input data-testid="txn-date" type="date" className="w-40" value={txn.date} onChange={(e) => setTxn({ ...txn, date: e.target.value })} /></div>
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
                  <button data-testid="sort-date-btn" onClick={() => setSortAsc((s) => !s)} className="inline-flex items-center gap-1 hover:text-foreground">Tarih <ArrowUpDown size={12} /></button>
                </th>
                <th className="text-left px-4 py-2.5 font-medium">İşlem Türü</th>
                <th className="text-left px-4 py-2.5 font-medium">Açıklama</th>
                <th className="text-right px-4 py-2.5 font-medium">Borç</th>
                <th className="text-right px-4 py-2.5 font-medium">Alacak</th>
                <th className="text-right px-4 py-2.5 font-medium">Bakiye</th>
                <th className="w-16"></th>
              </tr></thead>
              <tbody>
                {visibleTxns.map((t) => (
                  <tr key={t.id} data-testid={`txn-row-${t.id}`} className="border-t border-border">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(t.date || t.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded ${t.kind === "acilis" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : t.type === "borc" ? "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
                        {t.kind === "acilis" ? "Devir / Açılış Bakiyesi" : t.type === "borc" ? "Borç/Tahakkuk" : "Tahsilat"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{t.aciklama}</td>
                    <td className="px-4 py-2.5 text-right">{t.type === "borc" ? fmtTL(t.amount) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{t.type === "alacak" ? fmtTL(t.amount) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmtTL(t.running)}</td>
                    <td className="px-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button data-testid={`txn-edit-${t.id}`} onClick={() => setEditTxn({ id: t.id, type: t.type, amount: t.amount, aciklama: t.aciklama || "", date: (t.date || t.created_at || "").slice(0, 10) })} className="text-muted-foreground hover:text-blue-500"><Pencil size={14} /></button>
                        <button data-testid={`txn-delete-${t.id}`} onClick={() => delTxn(t.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleTxns.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Hareket yok</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="evraklar">
          <ClientDocuments clientId={id} clientName={c.unvan} />
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

      <Dialog open={openOB} onOpenChange={setOpenOB}>
        <DialogContent>
          <DialogHeader><DialogTitle>Açılış / Devir Bakiyesi</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Tarih</Label><Input data-testid="ob-date" type="date" value={ob.date} onChange={(e) => setOB({ ...ob, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Bakiye Yönü</Label>
              <Select value={ob.direction} onValueChange={(v) => setOB({ ...ob, direction: v })}>
                <SelectTrigger data-testid="ob-direction"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="borc">Müşteri Borçlu</SelectItem><SelectItem value="alacak">Müşteri Alacaklı</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Tutar (TL)</Label><Input data-testid="ob-amount" type="number" value={ob.amount} onChange={(e) => setOB({ ...ob, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Açıklama</Label><Input data-testid="ob-desc" value={ob.aciklama} onChange={(e) => setOB({ ...ob, aciklama: e.target.value })} placeholder="Devir Bakiyesi" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenOB(false)}>İptal</Button>
            <Button data-testid="ob-save" onClick={() => saveOpening(false)}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
