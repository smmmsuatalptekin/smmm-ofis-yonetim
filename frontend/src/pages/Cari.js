import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { fmtTL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";

export default function Cari({ collectionsMode }) {
  const [clients, setClients] = useState([]);
  const [balances, setBalances] = useState({});
  const nav = useNavigate();

  const load = async () => {
    const { data: cs } = await api.get("/clients");
    setClients(cs);
    const results = await Promise.all(cs.map((c) => api.get(`/clients/${c.id}/transactions`).then((r) => [c.id, r.data]).catch(() => [c.id, null])));
    const b = {}; results.forEach(([id, d]) => { if (d) b[id] = d; });
    setBalances(b);
  };
  useEffect(() => { load(); }, []);

  const runAccrual = async () => {
    const period = new Date().toISOString().slice(0, 7);
    const { data } = await api.post("/accrual/run", { period });
    toast.success(`${data.count} mükellefe ${period} hizmet bedeli tahakkuk ettirildi`);
    load();
  };

  const totalAlacak = Object.values(balances).reduce((a, d) => a + Math.max(0, d.bakiye), 0);
  const totalCollected = Object.values(balances).reduce((a, d) => a + d.alacak, 0);

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-head text-3xl font-semibold tracking-tight">{collectionsMode ? "Tahsilatlar" : "Cari Hesap"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Mükellef bazında bakiye ve tahsilat durumu</p></div>
        {!collectionsMode && <Button data-testid="run-accrual-btn" onClick={runAccrual}><PlayCircle size={16} className="mr-1.5" /> Aylık Ücret Tahakkuku Çalıştır</Button>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground tracking-wide">Toplam Alacak</div><div className="font-head text-2xl font-semibold mt-1 text-rose-600">{fmtTL(totalAlacak)}</div></Card>
        <Card className="p-5"><div className="text-xs uppercase text-muted-foreground tracking-wide">Toplam Tahsilat</div><div className="font-head text-2xl font-semibold mt-1 text-emerald-600">{fmtTL(totalCollected)}</div></Card>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr>
            <th className="text-left px-4 py-3 font-medium">Mükellef</th>
            <th className="text-right px-4 py-3 font-medium">Tahakkuk</th>
            <th className="text-right px-4 py-3 font-medium">Tahsilat</th>
            <th className="text-right px-4 py-3 font-medium">Bakiye</th>
          </tr></thead>
          <tbody>
            {clients.map((c) => {
              const b = balances[c.id];
              return (
                <tr key={c.id} onClick={() => nav(`/mukellefler/${c.id}`)} className="border-t border-border hover:bg-accent cursor-pointer">
                  <td className="px-4 py-3 font-medium">{c.unvan}</td>
                  <td className="px-4 py-3 text-right">{b ? fmtTL(b.borc) : "..."}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{b ? fmtTL(b.alacak) : "..."}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${b && b.bakiye > 0 ? "text-rose-600" : "text-emerald-600"}`}>{b ? fmtTL(b.bakiye) : "..."}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
