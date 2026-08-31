"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { salvaVotiEvento } from "@/lib/actions";
import { repartoColor, repartoLabel } from "@/lib/reparti";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const TIPO_LABEL: Record<string, string> = { diretta: "Diretta", riunione: "Riunione", altro: "Altro" };

type Evento = {
  id: string;
  titolo: string;
  quando: string;
  fine: string | null;
  tipo: string;
  membri: string[] | null;
};
type Membro = { id: string; full_name: string | null; email: string; reparto: string | null };
type Voto = { evento_id: string; membro_id: string; attitudine: number; professionalita: number; performance: number };

const PARAMETRI = [
  { key: "attitudine", label: "Attitudine alla puntata", hint: "Attenzione alle regole" },
  { key: "professionalita", label: "Professionalità", hint: "Ha lavorato bene?" },
  { key: "performance", label: "Performance", hint: "Bravura nella task" },
] as const;

export default function ValutazioniClient({
  anno,
  mese,
  eventi,
  membri,
  votiEsistenti,
}: {
  anno: number;
  mese: number;
  eventi: Evento[];
  membri: Membro[];
  votiEsistenti: Voto[];
}) {
  const [eventoAperto, setEventoAperto] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [salvato, setSalvato] = useState<string | null>(null);

  const membroById = (id: string) => membri.find((m) => m.id === id);
  const votoDi = (eventoId: string, membroId: string) =>
    votiEsistenti.find((v) => v.evento_id === eventoId && v.membro_id === membroId);

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  // Raggruppa per giorno.
  const gruppi: { chiave: string; label: string; eventi: Evento[] }[] = [];
  eventi.forEach((e) => {
    const d = new Date(e.quando);
    const chiave = d.toDateString();
    let g = gruppi.find((gr) => gr.chiave === chiave);
    if (!g) {
      g = { chiave, label: d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }), eventi: [] };
      gruppi.push(g);
    }
    g.eventi.push(e);
  });

  const evento = eventoAperto ? eventi.find((e) => e.id === eventoAperto) : null;
  const partecipanti = evento?.membri?.map(membroById).filter(Boolean) as Membro[] | undefined;

  function handleSalva(formData: FormData) {
    if (!evento || !evento.membri) return;
    startTransition(async () => {
      await salvaVotiEvento(evento.id, evento.membri!, formData);
      setSalvato(evento.id);
      setTimeout(() => setSalvato(null), 2000);
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Valutazioni</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/dashboard/valutazioni?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/valutazioni?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Dirette e riunioni del mese. Apri una puntata per valutare chi c'era.
      </p>

      {gruppi.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna diretta o riunione questo mese.</p>
      )}

      {gruppi.map((g) => (
        <div key={g.chiave} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-text)", textTransform: "capitalize", marginBottom: 8 }}>
            {g.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {g.eventi.map((e) => {
              const nPartecipanti = e.membri?.length ?? 0;
              const nValutati = (e.membri ?? []).filter((mid) => votoDi(e.id, mid)).length;
              return (
                <button
                  key={e.id}
                  onClick={() => setEventoAperto(e.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 12,
                    background: "var(--white)", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.titolo}</div>
                    <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 2 }}>
                      {TIPO_LABEL[e.tipo]} · {new Date(e.quando).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{nPartecipanti} {nPartecipanti === 1 ? "persona" : "persone"}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: nPartecipanti === 0 ? "var(--light-bg)" : nValutati === nPartecipanti ? "#DCFCE7" : "#FEF3C7",
                      color: nPartecipanti === 0 ? "var(--gray-text)" : nValutati === nPartecipanti ? "#166534" : "#92400E",
                    }}
                  >
                    {nPartecipanti === 0 ? "Nessuno" : `${nValutati}/${nPartecipanti} valutati`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* --- scheda di valutazione --- */}
      {evento && (
        <div
          onClick={() => setEventoAperto(null)}
          className="overlay-fade"
          style={{ position: "fixed", inset: 0, background: "rgba(6,11,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop"
            style={{ background: "var(--white)", borderRadius: 20, padding: 26, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{evento.titolo}</h3>
              <button onClick={() => setEventoAperto(null)} style={{ border: "none", background: "var(--light-bg)", width: 30, height: 30, borderRadius: "50%", fontSize: 15, color: "var(--gray-text)", cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--gray-text)", marginBottom: 18 }}>
              {new Date(evento.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {(!partecipanti || partecipanti.length === 0) && (
              <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna persona assegnata a questo evento.</p>
            )}

            {partecipanti && partecipanti.length > 0 && (
              <form action={handleSalva} style={{ display: "grid", gap: 16 }}>
                {partecipanti.map((p) => {
                  const votoEsistente = votoDi(evento.id, p.id);
                  return (
                    <div key={p.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: repartoColor(p.reparto) }} />
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.full_name || p.email}</span>
                        <span style={{ fontSize: 11, color: "var(--gray-text)" }}>{repartoLabel(p.reparto)}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                        {PARAMETRI.map((param) => (
                          <div key={param.key}>
                            <label style={{ fontSize: 10.5, fontWeight: 600, display: "block", marginBottom: 3 }}>{param.label}</label>
                            <select
                              name={`${param.key}_${p.id}`}
                              defaultValue={votoEsistente ? String(votoEsistente[param.key]) : "3"}
                              style={{ width: "100%", padding: "7px 8px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12.5, fontFamily: "inherit" }}
                            >
                              {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <button type="submit" className="btn-primary">
                  {isPending ? "Salvataggio…" : "Salva valutazioni"}
                </button>
                {salvato === evento.id && <p style={{ fontSize: 12, color: "#166534", textAlign: "center", margin: 0 }}>Valutazioni salvate.</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontSize: 16, color: "var(--dark)", padding: "3px 10px", borderRadius: 7, background: "var(--light-bg)",
};
