import React, { useEffect, useState } from "react";
import api, { TASK_STATUS_COLORS, deadlineColor } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const STATUSES = ["Bekliyor", "Devam Ediyor", "Kontrol Bekliyor", "Tamamlandı", "İptal"];
const ONCELIK = ["Düşük", "Orta", "Yüksek"];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ oncelik: "Orta", status: "Bekliyor" });

  const load = () => api.get("/tasks").then((r) => setTasks(r.data));
  useEffect(() => {
    load();
    api.get("/clients").then((r) => setClients(r.data));
    api.get("/users").then((r) => setUsers(r.data));
  }, []);

  const save = async () => {
    if (!form.baslik) return toast.error("Başlık zorunlu");
    await api.post("/tasks", form);
    toast.success("Görev oluşturuldu"); setOpen(false); setForm({ oncelik: "Orta", status: "Bekliyor" }); load();
  };
  const setStatus = async (t, status) => { await api.put(`/tasks/${t.id}`, { status }); load(); };
  const del = async (id) => { await api.delete(`/tasks/${id}`); load(); };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-head text-3xl font-semibold tracking-tight">Görevler</h1>
        <p className="text-sm text-muted-foreground mt-1">{tasks.filter((t) => !["Tamamlandı", "İptal"].includes(t.status)).length} açık görev</p></div>
        <Button data-testid="add-task-btn" onClick={() => setOpen(true)}><Plus size={16} className="mr-1.5" /> Yeni Görev</Button>
      </div>

      <div className="grid gap-2">
        {tasks.map((t) => {
          const days = t.deadline ? Math.ceil((new Date(t.deadline) - new Date(today)) / 86400000) : null;
          return (
            <Card key={t.id} data-testid={`task-${t.id}`} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{t.baslik}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                  {t.client_name && <span>{t.client_name}</span>}
                  {t.sorumlu && <span>· {t.sorumlu}</span>}
                  {t.deadline && <span className={deadlineColor(days ?? 99)}>· Son: {t.deadline} {days < 0 && !["Tamamlandı","İptal"].includes(t.status) ? "(gecikti)" : ""}</span>}
                </div>
              </div>
              <Badge variant="outline">{t.oncelik}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`text-xs px-2.5 py-1 rounded-md border ${TASK_STATUS_COLORS[t.status]}`}>{t.status}</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>{STATUSES.map((s) => <DropdownMenuItem key={s} onClick={() => setStatus(t, s)}>{s}</DropdownMenuItem>)}</DropdownMenuContent>
              </DropdownMenu>
              <button onClick={() => del(t.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 size={16} /></button>
            </Card>
          );
        })}
        {tasks.length === 0 && <Card className="p-10 text-center text-muted-foreground">Henüz görev yok</Card>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Görev</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Başlık *</Label><Input data-testid="task-title" value={form.baslik || ""} onChange={(e) => setForm({ ...form, baslik: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Mükellef</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger data-testid="task-client"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.unvan}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Sorumlu</Label>
                <Select value={form.sorumlu} onValueChange={(v) => setForm({ ...form, sorumlu: v })}>
                  <SelectTrigger data-testid="task-assignee"><SelectValue placeholder="Seçin" /></SelectTrigger>
                  <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Öncelik</Label>
                <Select value={form.oncelik} onValueChange={(v) => setForm({ ...form, oncelik: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ONCELIK.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Son Tarih</Label><Input data-testid="task-deadline" type="date" value={form.deadline || ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Açıklama</Label><Input value={form.aciklama || ""} onChange={(e) => setForm({ ...form, aciklama: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="save-task-btn" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
