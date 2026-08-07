import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { fmtTL, STATUS_COLORS } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, MapPin, Plus, Trash2 } from "lucide-react";

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [cari, setCari] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [txn, setTxn] = useState({ type: "alacak", amount: "", aciklama: "", yontem: "Havale" });

  const loadCari = () => api.get(`/clients/${id}/transactions`).then((r) => setCari(r.data));
  useEffect(() => {
    api.get(`/clients/${id}`).then((r) => setC(r.data));
    loadCari();
    api.get("/tasks", { params: { client_id: id } }).then((r) => setTasks(r.data));
  }, [id]);

  if (!c) return <div className="text-muted-foreground">Yükleniyor...</div>;

  const addTxn = async () => {
    if (!txn.amount) return toast.error("Tutar girin");
    await api.post("/transactions", { ...txn, client_id: id, amount: Number(txn.amount) });
    toast.success("Cari hareket eklendi");
    setTxn({ type: "alacak", amount: "", aciklama: "", yontem: "Havale" });
    loadCari();
  };
  const delTxn = async (tid) => { await api.delete(`/transactions/${tid}`); loadCari(); };

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
            <div className="flex flex-wrap items-end gap-3">
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
                <th className="text-left px-4 py-2.5 font-medium">Tarih</th><th className="text-left px-4 py-2.5 font-medium">Açıklama</th>
                <th className="text-right px-4 py-2.5 font-medium">Borç</th><th className="text-right px-4 py-2.5 font-medium">Alacak</th><th></th>
              </tr></thead>
              <tbody>
                {cari?.transactions.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-2.5 text-muted-foreground">{t.date}</td>
                    <td className="px-4 py-2.5">{t.aciklama}</td>
                    <td className="px-4 py-2.5 text-right">{t.type === "borc" ? fmtTL(t.amount) : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{t.type === "alacak" ? fmtTL(t.amount) : "—"}</td>
                    <td className="px-2"><button onClick={() => delTxn(t.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
                {cari?.transactions.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Hareket yok</td></tr>}
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
    </div>
  );
}
