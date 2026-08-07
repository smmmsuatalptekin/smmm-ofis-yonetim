import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [ref, setRef] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});

  const load = () => api.get("/calendar").then((r) => setEvents(r.data));
  useEffect(() => { load(); }, []);

  const y = ref.getFullYear(), m = ref.getMonth();
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const evByDay = (d) => {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return events.filter((e) => e.date === ds);
  };

  const save = async () => {
    if (!form.title || !form.date) return toast.error("Başlık ve tarih zorunlu");
    await api.post("/calendar", form); toast.success("Etkinlik eklendi"); setOpen(false); setForm({}); load();
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-head text-3xl font-semibold tracking-tight">Takvim</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setRef(new Date(y, m - 1, 1))} className="p-2 rounded-md hover:bg-accent"><ChevronLeft size={18} /></button>
          <span className="font-medium w-36 text-center">{MONTHS[m]} {y}</span>
          <button onClick={() => setRef(new Date(y, m + 1, 1))} className="p-2 rounded-md hover:bg-accent"><ChevronRight size={18} /></button>
          <Button data-testid="add-event-btn" onClick={() => setOpen(true)}><Plus size={16} className="mr-1.5" /> Etkinlik</Button>
        </div>
      </div>
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2 text-xs font-medium text-muted-foreground uppercase">{DAYS.map((d) => <div key={d} className="text-center py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => (
            <div key={i} className={`min-h-[92px] rounded-lg border border-border p-1.5 ${d ? "bg-card" : "bg-transparent border-transparent"}`}>
              {d && <div className="text-xs font-medium text-muted-foreground mb-1">{d}</div>}
              {d && evByDay(d).map((e) => (
                <div key={e.id} className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 mb-0.5 truncate">{e.title}</div>
              ))}
            </div>
          ))}
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Etkinlik</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Başlık</Label><Input data-testid="event-title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tarih</Label><Input data-testid="event-date" type="date" value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="save-event-btn" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
