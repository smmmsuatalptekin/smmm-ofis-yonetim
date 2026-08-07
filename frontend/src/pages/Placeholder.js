import React from "react";
import { Construction } from "lucide-react";

export default function Placeholder({ title, desc }) {
  return (
    <div className="fade-in">
      <h1 className="font-head text-3xl font-semibold tracking-tight mb-6">{title}</h1>
      <div className="border border-dashed border-border rounded-xl p-16 grid place-items-center text-center bg-card">
        <Construction className="text-muted-foreground mb-4" size={40} />
        <p className="text-muted-foreground max-w-md">{desc}</p>
      </div>
    </div>
  );
}
