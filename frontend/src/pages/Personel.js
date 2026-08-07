import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, UserCog } from "lucide-react";

const ROLES = [
  { v: "admin", l: "Admin" }, { v: "mali_musavir", l: "Mali Müşavir" }, { v: "ofis_yoneticisi", l: "Ofis Yöneticisi" },
  { v: "kidemli", l: "Kıdemli Personel" }, { v: "muhasebe", l: "Muhasebe Personeli" }, { v: "bordro", l: "Bordro Personeli" },
  { v: "stajyer", l: "Stajyer" }, { v: "salt_okuma", l: "Salt Okuma" },
];
const roleLabel = (v) => ROLES.find((r) => r.v === v)?.l || v;

export default function Personel() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ role: "muhasebe" });
  const canManage = ["admin", "mali_musavir"].includes(user?.role);

  const load = () => api.get("/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.email || !form.password) return toast.error("Tüm alanlar zorunlu");
    try {
      await api.post("/users", form);
      toast.success("Personel eklendi"); setOpen(false); setForm({ role: "muhasebe" }); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Hata"); }
  };
  const del = async (id) => { try { await api.delete(`/users/${id}`); load(); } catch { toast.error("Silinemedi"); } };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-head text-3xl font-semibold tracking-tight">Personel</h1>
        <p className="text-sm text-muted-foreground mt-1">Ofis kullanıcıları ve rolleri</p></div>
        {canManage && <Button data-testid="add-user-btn" onClick={() => setOpen(true)}><Plus size={16} className="mr-1.5" /> Yeni Personel</Button>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <Card key={u.id} className="p-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-accent grid place-items-center font-semibold">{u.name?.slice(0, 2)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{u.name}</div>
              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              <Badge variant="secondary" className="mt-1">{roleLabel(u.role)}</Badge>
            </div>
            {canManage && u.role !== "admin" && <button onClick={() => del(u.id)} className="text-muted-foreground hover:text-rose-500"><Trash2 size={16} /></button>}
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Personel</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Ad Soyad</Label><Input data-testid="user-name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">E-posta</Label><Input data-testid="user-email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Şifre</Label><Input data-testid="user-password" type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="user-role"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>İptal</Button><Button data-testid="save-user-btn" onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
