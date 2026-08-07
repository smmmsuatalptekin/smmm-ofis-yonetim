import React, { useEffect, useState } from "react";
import api, { fmtTL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Reports() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/reports").then((r) => setD(r.data)); }, []);
  if (!d) return <div className="text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-5 fade-in">
      <h1 className="font-head text-3xl font-semibold tracking-tight">Raporlar</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground tracking-wide">Aktif Mükellef</div><div className="font-head text-3xl font-semibold mt-1">{d.total_clients}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground tracking-wide">Beyanname Tamamlama</div><div className="font-head text-3xl font-semibold mt-1 text-emerald-600">%{d.declaration_completion}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground tracking-wide">Personel Sayısı</div><div className="font-head text-3xl font-semibold mt-1">{d.workload.length}</div></Card>
      </div>
      <Card className="p-5">
        <h3 className="font-head font-medium mb-4">Aylık Tahakkuk & Tahsilat</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={d.monthly}>
            <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip formatter={(v) => fmtTL(v)} />
            <Legend />
            <Bar dataKey="tahakkuk" name="Tahakkuk" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
            <Bar dataKey="tahsilat" name="Tahsilat" fill="#0d9488" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card className="p-5">
        <h3 className="font-head font-medium mb-4">Personel İş Yükü (Mükellef Sayısı)</h3>
        <div className="space-y-2">
          {d.workload.map((w) => (
            <div key={w.personel} className="flex items-center gap-3">
              <span className="text-sm w-40 truncate">{w.personel}</span>
              <div className="flex-1 h-6 bg-secondary rounded-md overflow-hidden">
                <div className="h-full bg-primary rounded-md" style={{ width: `${Math.min(100, w.adet / Math.max(...d.workload.map((x) => x.adet)) * 100)}%` }} />
              </div>
              <span className="text-sm font-medium w-8 text-right">{w.adet}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
