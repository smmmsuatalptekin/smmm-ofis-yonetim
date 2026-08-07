import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { fmtTL, deadlineColor } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Users, FileClock, AlertTriangle, Wallet, TrendingUp, BookOpen, ListChecks, ArrowRight } from "lucide-react";

const COLORS = ["#1e3a5f", "#0d9488", "#f59e0b", "#3b82f6", "#e11d48", "#8b5cf6"];

function Kpi({ icon: Icon, label, value, sub, onClick, accent }) {
  return (
    <Card onClick={onClick} data-testid={`kpi-${label}`}
      className={`p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-sm border-border ${onClick ? "" : "cursor-default"}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="font-head text-3xl font-semibold mt-2 tracking-tight">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className={`w-10 h-10 rounded-lg grid place-items-center ${accent || "bg-accent"}`}><Icon size={18} /></div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const nav = useNavigate();
  useEffect(() => { api.get("/dashboard").then((r) => setD(r.data)); }, []);
  if (!d) return <div className="text-muted-foreground">Yükleniyor...</div>;

  const pieData = Object.entries(d.by_type).map(([k, v]) => ({ name: k, value: v }));
  const pendData = Object.entries(d.pending_by_type).map(([k, v]) => ({ name: k, adet: v }));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-head text-3xl font-semibold tracking-tight">Genel Bakış</h1>
          <p className="text-sm text-muted-foreground mt-1">Dönem: {d.period} · Ofisinizin güncel durumu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Aktif Mükellef" value={d.total_clients} sub="Toplam kayıtlı" onClick={() => nav("/mukellefler")} accent="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" />
        <Kpi icon={FileClock} label="Bekleyen Beyanname" value={Object.values(d.pending_by_type).reduce((a, b) => a + b, 0)} sub="Bu dönem tamamlanmadı" onClick={() => nav("/beyannameler")} accent="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" />
        <Kpi icon={BookOpen} label="Eksik e-Defter" value={`${d.edefter_eksik}/${d.edefter_total}`} sub="Berat tamamlanmadı" onClick={() => nav("/edefter")} accent="bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" />
        <Kpi icon={Wallet} label="Toplam Alacak" value={fmtTL(d.toplam_alacak)} sub="Tahsil edilmemiş" onClick={() => nav("/cari")} accent="bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" />
        <Kpi icon={TrendingUp} label="Bu Ay Tahsilat" value={fmtTL(d.this_month_collected)} sub={`Tahakkuk: ${fmtTL(d.this_month_accrued)}`} onClick={() => nav("/tahsilatlar")} accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" />
        <Kpi icon={ListChecks} label="Açık Görev" value={d.open_tasks} sub={`${d.overdue_tasks} gecikmiş`} onClick={() => nav("/gorevler")} accent="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" />
        <Kpi icon={AlertTriangle} label="Gecikmiş Görev" value={d.overdue_tasks} sub="Acil aksiyon" onClick={() => nav("/gorevler")} accent="bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-head font-medium mb-4">Bekleyen Beyannameler (Tür bazında)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pendData}>
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="adet" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-head font-medium mb-4">Mükellef Dağılımı</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {p.name} <span className="ml-auto font-medium">{p.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-head font-medium">Yaklaşan & Gecikmiş Son Tarihler</h3>
          <span className="text-xs text-muted-foreground">Önümüzdeki 7 gün</span>
        </div>
        {d.upcoming.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Yaklaşan kritik son tarih yok.</p> : (
          <div className="space-y-1">
            {d.upcoming.map((u, i) => (
              <div key={i} onClick={() => nav(`/mukellefler/${u.client_id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <span className={`w-2 h-2 rounded-full ${u.days < 0 ? "bg-rose-500" : u.days <= 1 ? "bg-orange-500" : "bg-amber-500"}`} />
                <span className="text-sm font-medium flex-1">{u.unvan}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-secondary">{u.type}</span>
                <span className={`text-xs font-medium ${deadlineColor(u.days)}`}>
                  {u.days < 0 ? `${-u.days} gün gecikti` : u.days === 0 ? "Bugün" : `${u.days} gün kaldı`}
                </span>
                <ArrowRight size={14} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {d.top_debtors.length > 0 && (
        <Card className="p-5">
          <h3 className="font-head font-medium mb-4">En Borçlu Mükellefler</h3>
          <div className="space-y-1">
            {d.top_debtors.map((t) => (
              <div key={t.client_id} onClick={() => nav(`/mukellefler/${t.client_id}`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <span className="text-sm font-medium flex-1">{t.unvan}</span>
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">{fmtTL(t.bakiye)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
