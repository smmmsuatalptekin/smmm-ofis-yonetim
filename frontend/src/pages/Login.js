import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

function formatErr(d) {
  if (!d) return "Bir hata oluştu";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e.msg || JSON.stringify(e)).join(" ");
  return d.msg || String(d);
}

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("smmmsuatalptekin@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) nav("/");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Giriş başarılı");
      nav("/");
    } catch (err) {
      toast.error(formatErr(err.response?.data?.detail));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary text-primary-foreground p-12">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary-foreground text-primary grid place-items-center font-head font-bold">S</div>
          <span className="font-head font-semibold">SMMM Ofis Yönetim</span>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="font-head text-4xl font-semibold tracking-tight leading-tight">Ofisinizin tüm süreçleri tek ekranda.</h1>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">Mükellef, beyanname, e-Defter, cari hesap, görev ve son tarih takibi. Hangi müşterinin hangi işi kaldığını artık siz düşünmeyin.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary-foreground/60"><ShieldCheck size={16} /> KVKK uyumlu · Rol bazlı erişim · Denetim kaydı</div>
      </div>
      <div className="flex-1 grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5 fade-in">
          <div>
            <h2 className="font-head text-2xl font-semibold tracking-tight">Giriş yap</h2>
            <p className="text-sm text-muted-foreground mt-1">Hesabınıza erişmek için giriş yapın</p>
          </div>
          <div className="space-y-2">
            <Label>E-posta</Label>
            <Input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Şifre</Label>
            <Input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Smmm2026!" />
          </div>
          <Button data-testid="login-submit" type="submit" disabled={loading} className="w-full">{loading ? "Giriş yapılıyor..." : "Giriş Yap"}</Button>
        </form>
      </div>
    </div>
  );
}
