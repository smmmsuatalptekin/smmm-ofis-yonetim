import React, { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, Send, User } from "lucide-react";

const SUGGESTIONS = [
  "Bu ay KDV'si verilmemiş müşterileri göster",
  "e-Defteri eksik olan mükellefler kim?",
  "Bana ödeme yapmayan müşterileri listele",
  "Bugün ve bu hafta hangi işlerim var?",
];

export default function Assistant() {
  const [msgs, setMsgs] = useState([{ role: "bot", text: "Merhaba! Ofisinizle ilgili sorularınızı yanıtlayabilirim. Örneğin: \"Bu ay KDV'si verilmemiş müşterileri göster\"." }]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = async (text) => {
    const question = text || q;
    if (!question.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ(""); setLoading(true);
    try {
      const { data } = await api.post("/assistant", { question });
      setMsgs((m) => [...m, { role: "bot", text: data.answer }]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Bir hata oluştu, tekrar deneyin." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="fade-in max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4"><h1 className="font-head text-3xl font-semibold tracking-tight flex items-center gap-2"><Bot size={28} /> Akıllı Asistan</h1>
      <p className="text-sm text-muted-foreground mt-1">Yalnızca kendi ofis verileriniz üzerinde çalışır.</p></div>
      <Card className="flex-1 overflow-y-auto p-4 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent"}`}>{m.role === "user" ? <User size={16} /> : <Bot size={16} />}</div>
            <div className={`text-sm rounded-xl px-4 py-2.5 max-w-[80%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.text}</div>
          </div>
        ))}
        {loading && <div className="flex gap-3"><div className="w-8 h-8 rounded-lg bg-accent grid place-items-center"><Bot size={16} /></div><div className="text-sm text-muted-foreground py-2.5">Düşünüyor...</div></div>}
        <div ref={endRef} />
      </Card>
      <div className="flex flex-wrap gap-2 mt-3">
        {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors">{s}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 mt-3">
        <Input data-testid="assistant-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sorunuzu yazın..." />
        <Button data-testid="assistant-send" type="submit" disabled={loading}><Send size={16} /></Button>
      </form>
    </div>
  );
}
