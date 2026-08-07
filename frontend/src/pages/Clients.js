import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { fmtTL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Search, Building2 } from "lucide-react";

const TURLER = ["Şahıs", "Limited", "Anonim", "Diğer"];
const BEYAN = ["KDV1", "KDV2", "MUHSGK", "Damga", "Geçici Vergi", "Gelir Vergisi", "Kurumlar", "BA/BS"];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState("");
  const [tur, setTur] = useState("hepsi");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ beyanname_turleri: ["KDV1", "MUHSGK"] });
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const load = () => {
    const params = {};
    if (q) params.q = q;
    if (tur !== "hepsi") params.tur = tur;
    api.get("/clients", { params }).then((r) => setClients(r.data));
  };
  useEffect(() => { load(); }, [q, tur]);
  useEffect(() => { if (sp.get("yeni")) setOpen(true); }, [sp]);

  const save = async () => {
    if (!form.unvan) return toast.error("Ünvan zorunlu");
    try {
      await api.post("/clients", { ...form, aylik_ucret: Number(form.aylik_ucret) || 0 });
      toast.success("Mükellef eklendi");
      setOpen(false); setForm({ beyanname_turleri: ["KDV1", "MUHSGK"] }); load();
    } catch (e) { toast.error("Kayıt başarısız"); }
  };

  const toggleBeyan = (b) => {
    const cur = form.beyanname_turleri || [];
    setForm({ ...form, beyanname_turleri: cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b] });
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-head text-3xl font-semibold tracking-tight">Mükellefler</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} kayıt</p>
        </div>
        <Button data-testid="add-client-btn" onClick={() => setOpen(true)}><Plus size={16} className="mr-1.5" /> Yeni Mükellef</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="client-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ünvan, VKN, telefon, yetkili ara..." className="pl-9" />
        </div>
        <Select value={tur} onValueChange={setTur}>
          <SelectTrigger className="w-44" data-testid="client-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hepsi">Tüm türler</SelectItem>
            {TURLER.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Ünvan</th>
                <th className="text-left font-medium px-4 py-3">Tür</th>
                <th className="text-left font-medium px-4 py-3">VKN/TCKN</th>
                <th className="text-left font-medium px-4 py-3">Sorumlu</th>
                <th className="text-right font-medium px-4 py-3">Aylık Ücret</th>
                <th className="text-center font-medium px-4 py-3">Durum</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} data-testid={`client-row-${c.id}`} onClick={() => nav(`/mukellefler/${c.id}`)}
                  className="border-t border-border hover:bg-accent cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium flex items-center gap-2"><Building2 size={15} className="text-muted-foreground" />{c.unvan}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{c.sirket_turu}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.vkn || c.tckn}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.sorumlu_personel}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtTL(c.aylik_ucret)}</td>
                  <td className="px-4 py-3 text-center">{c.aktif ? <span className="text-emerald-600 text-xs">Aktif</span> : <span className="text-muted-foreground text-xs">Pasif</span>}</td>
                </tr>
              ))}
              {clients.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Kayıt bulunamadı</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Yeni Mükellef</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {[["unvan", "Ünvan *"], ["vkn", "Vergi Kimlik No"], ["tckn", "TC Kimlik No"], ["vergi_dairesi", "Vergi Dairesi"],
              ["nace", "NACE Kodu"], ["faaliyet", "Faaliyet Konusu"], ["telefon", "Telefon"], ["email", "E-posta"],
              ["yetkili", "Yetkili Kişi"], ["kep", "KEP Adresi"], ["sorumlu_personel", "Sorumlu Personel"]].map(([k, l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{l}</Label>
                <Input data-testid={`client-field-${k}`} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs">Şirket Türü</Label>
              <Select value={form.sirket_turu} onValueChange={(v) => setForm({ ...form, sirket_turu: v })}>
                <SelectTrigger data-testid="client-field-tur"><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>{TURLER.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Aylık Ücret (TL)</Label>
              <Input data-testid="client-field-ucret" type="number" value={form.aylik_ucret || ""} onChange={(e) => setForm({ ...form, aylik_ucret: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Beyanname Türleri</Label>
            <div className="flex flex-wrap gap-3">
              {BEYAN.map((b) => (
                <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={(form.beyanname_turleri || []).includes(b)} onCheckedChange={() => toggleBeyan(b)} /> {b}
                </label>
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.edefter} onCheckedChange={(v) => setForm({ ...form, edefter: v })} /> e-Defter</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.efatura} onCheckedChange={(v) => setForm({ ...form, efatura: v })} /> e-Fatura</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button data-testid="save-client-btn" onClick={save}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
