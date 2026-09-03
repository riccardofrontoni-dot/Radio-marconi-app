"use client";

import { useState, useTransition } from "react";
import { inviaAvviso } from "@/lib/actions";
import { repartoColor, repartoLabel } from "@/lib/reparti";

type Persona = { id: string; full_name: string | null; email: string; ruolo: string; reparto: string | null };

export default function PanoramicaPersone({ persone }: { persone: Persona[] }) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [testi, setTesti] = useState<Record<string, string>>({});

  function mostraToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function invia(id: string, nome: string) {
    const testo = (testi[id] || "").trim();
    if (!testo) return;
    const fd = new FormData();
    fd.set("testo", testo);
    startTransition(async () => {
      await inviaAvviso(id, fd);
      mostraToast(`Avviso inviato a ${nome.split(" ")[0]}`);
      setTesti((t) => ({ ...t, [id]: "" }));
    });
  }

  return (
    <div>
      <div className="section-label" style={{ marginTop: 0 }}>Panoramica</div>
      <p style={{ fontSize: 12.5, color: "var(--gray-text)", marginTop: -6, marginBottom: 14 }}>
        RAD e capi reparto — manda un avviso diretto a chi vuoi.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {persone.map((p) => (
          <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.reparto ? repartoColor(p.reparto) : "var(--dark)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
              {(p.full_name || p.email).split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div style={{ minWidth: 130 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.full_name || p.email}</div>
              <div style={{ fontSize: 11, color: "var(--gray-text)" }}>
                {p.ruolo === "rad" ? "RAD" : `Capo — ${repartoLabel(p.reparto)}`}
              </div>
            </div>
            <input
              value={testi[p.id] || ""}
              onChange={(e) => setTesti((t) => ({ ...t, [p.id]: e.target.value }))}
              type="text"
              placeholder="Scrivi un avviso..."
              style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 9, padding: "8px 11px", fontSize: 12.5, fontFamily: "inherit" }}
            />
            <button
              onClick={() => invia(p.id, p.full_name || p.email)}
              disabled={isPending}
              className="btn-primary"
              style={{ fontSize: 12, padding: "8px 14px", flexShrink: 0 }}
            >
              Invia
            </button>
          </div>
        ))}
        {persone.length === 0 && (
          <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun RAD o capo reparto trovato.</p>
        )}
      </div>

      <div
        style={{
          position: "fixed", bottom: 26, right: 26, background: "var(--dark)", color: "#fff", padding: "13px 18px",
          borderRadius: 13, fontSize: 13.5, display: "flex", alignItems: "center", gap: 10,
          transform: toast ? "translateY(0)" : "translateY(140%)", transition: "transform 0.3s cubic-bezier(.22,.9,.32,1)", zIndex: 60,
          boxShadow: "0 14px 30px -10px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}
