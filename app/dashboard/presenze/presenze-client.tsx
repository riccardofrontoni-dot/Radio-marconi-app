"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { impostaPresenza } from "@/lib/actions";
import { repartoColor, repartoLabel } from "@/lib/reparti";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

type Riunione = { id: string; titolo: string; quando: string; membri: string[] | null };
type Membro = { id: string; full_name: string | null; email: string; reparto: string | null };
type Presenza = { evento_id: string; membro_id: string; presente: boolean };

export default function PresenzeClient({
  anno,
  mese,
  riunioni,
  membri,
  presenzeEsistenti,
}: {
  anno: number;
  mese: number;
  riunioni: Riunione[];
  membri: Membro[];
  presenzeEsistenti: Presenza[];
}) {
  const [aperta, setAperta] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [presenze, setPresenze] = useState<Presenza[]>(presenzeEsistenti);
  const [toast, setToast] = useState<string | null>(null);

  const membroById = (id: string) => membri.find((m) => m.id === id);
  const presenzaDi = (eventoId: string, membroId: string) => presenze.find((p) => p.evento_id === eventoId && p.membro_id === membroId);

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  function mostraToast(testo: string) {
    setToast(testo);
    setTimeout(() => setToast(null), 2200);
  }

  function segna(eventoId: string, membroId: string, presente: boolean) {
    setPresenze((prev) => {
      const altri = prev.filter((p) => !(p.evento_id === eventoId && p.membro_id === membroId));
      return [...altri, { evento_id: eventoId, membro_id: membroId, presente }];
    });
    startTransition(async () => {
      await impostaPresenza(eventoId, membroId, presente);
      mostraToast(presente ? "Segnato: presente" : "Segnato: assente");
    });
  }

  const gruppi: { chiave: string; label: string; riunioni: Riunione[] }[] = [];
  riunioni.forEach((r) => {
    const d = new Date(r.quando);
    const chiave = d.toDateString();
    let g = gruppi.find((gr) => gr.chiave === chiave);
    if (!g) {
      g = { chiave, label: d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }), riunioni: [] };
      gruppi.push(g);
    }
    g.riunioni.push(r);
  });

  const riunioneAperta = aperta ? riunioni.find((r) => r.id === aperta) : null;
  const partecipanti = riunioneAperta?.membri?.map(membroById).filter(Boolean) as Membro[] | undefined;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Presenze</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/dashboard/presenze?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/presenze?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Riunioni del mese. Apri una riunione per segnare chi era presente.
      </p>

      {gruppi.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna riunione questo mese.</p>
      )}

      {gruppi.map((g) => (
        <div key={g.chiave} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-text)", textTransform: "capitalize", marginBottom: 8 }}>
            {g.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {g.riunioni.map((r) => {
              const nPartecipanti = r.membri?.length ?? 0;
              const nSegnati = (r.membri ?? []).filter((mid) => presenzaDi(r.id, mid)).length;
              return (
                <button
                  key={r.id}
                  onClick={() => setAperta(r.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 12,
                    background: "var(--white)", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.titolo}</div>
                    <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 2 }}>
                      {new Date(r.quando).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{nPartecipanti} {nPartecipanti === 1 ? "persona" : "persone"}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: nPartecipanti === 0 ? "var(--light-bg)" : nSegnati === nPartecipanti ? "#DCFCE7" : "#FEF3C7",
                      color: nPartecipanti === 0 ? "var(--gray-text)" : nSegnati === nPartecipanti ? "#166534" : "#92400E",
                    }}
                  >
                    {nPartecipanti === 0 ? "Nessuno" : `${nSegnati}/${nPartecipanti} segnati`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {riunioneAperta && (
        <div
          onClick={() => setAperta(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(6,11,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--white)", borderRadius: 20, padding: 26, width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{riunioneAperta.titolo}</h3>
              <button onClick={() => setAperta(null)} style={{ border: "none", background: "var(--light-bg)", width: 30, height: 30, borderRadius: "50%", fontSize: 15, color: "var(--gray-text)", cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--gray-text)", marginBottom: 18 }}>
              {new Date(riunioneAperta.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {(!partecipanti || partecipanti.length === 0) && (
              <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna persona assegnata a questa riunione.</p>
            )}

            {partecipanti && partecipanti.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {partecipanti.map((p) => {
                  const pres = presenzaDi(riunioneAperta.id, p.id);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: repartoColor(p.reparto), flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.full_name || p.email}</span>
                      <span style={{ fontSize: 10.5, color: "var(--gray-text)" }}>{repartoLabel(p.reparto)}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          disabled={isPending}
                          onClick={() => segna(riunioneAperta.id, p.id, true)}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                            border: `1px solid ${pres?.presente === true ? "#166534" : "var(--border)"}`,
                            background: pres?.presente === true ? "#166534" : "transparent",
                            color: pres?.presente === true ? "#fff" : "var(--gray-text)",
                          }}
                        >
                          Presente
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => segna(riunioneAperta.id, p.id, false)}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 999, cursor: "pointer",
                            border: `1px solid ${pres?.presente === false ? "#991B1B" : "var(--border)"}`,
                            background: pres?.presente === false ? "#991B1B" : "transparent",
                            color: pres?.presente === false ? "#fff" : "var(--gray-text)",
                          }}
                        >
                          Assente
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

const navBtnStyle: React.CSSProperties = {
  fontSize: 16, color: "var(--dark)", padding: "3px 10px", borderRadius: 7, background: "var(--light-bg)",
};
