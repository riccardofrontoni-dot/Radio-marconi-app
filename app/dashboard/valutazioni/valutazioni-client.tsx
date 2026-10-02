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
      <div className="fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Valutazioni</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={`/dashboard/valutazioni?mese=${mesePrec}`} className="evt-pill">‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/valutazioni?mese=${meseSucc}`} className="evt-pill">›</Link>
        </div>
      </div>
      <p className="fade-in-up fade-in-up-1" style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 20 }}>
        Dirette e riunioni del mese. Apri una puntata per valutare chi c'era.
      </p>

      <div className="card fade-in-up fade-in-up-2">
        {gruppi.length === 0 && (
          <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna diretta o riunione questo mese.</p>
        )}

        {gruppi.map((g) => (
          <div key={g.chiave}>
            <div className="val-day-label" style={{ textTransform: "capitalize" }}>{g.label}</div>
            {g.eventi.map((e) => {
              const nPartecipanti = e.membri?.length ?? 0;
              const nValutati = (e.membri ?? []).filter((mid) => votoDi(e.id, mid)).length;
              const badgeClass =
                nPartecipanti === 0 ? "val-badge-empty" : nValutati === nPartecipanti ? "val-badge-done" : "val-badge-partial";
              return (
                <button key={e.id} onClick={() => setEventoAperto(e.id)} className="val-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="val-row-title">{e.titolo}</div>
                    <div className="val-row-meta">
                      {TIPO_LABEL[e.tipo]} · {new Date(e.quando).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{nPartecipanti} {nPartecipanti === 1 ? "persona" : "persone"}
                    </div>
                  </div>
                  <span className={`val-badge ${badgeClass}`}>
                    {nPartecipanti === 0 ? "Nessuno" : `${nValutati}/${nPartecipanti} valutati`}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

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
            style={{ background: "#F5F5F7", borderRadius: 20, padding: "30px 30px 26px", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.4)", position: "relative" }}
          >
            <button
              onClick={() => setEventoAperto(null)}
              style={{ position: "absolute", top: 18, right: 18, border: "none", background: "var(--white)", width: 28, height: 28, borderRadius: "50%", fontSize: 13, color: "var(--gray-text)", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
            >
              ✕
            </button>

            <div className="val-eyebrow">Qualità · Valutazioni</div>
            <h1 className="val-title">{evento.titolo}</h1>
            <p className="val-subtitle">
              {new Date(evento.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
              {" · valuta chi ha partecipato"}
            </p>

            {(!partecipanti || partecipanti.length === 0) && (
              <p className="placeholder-note" style={{ marginTop: 14 }}>Nessuna persona assegnata a questo evento.</p>
            )}

            {partecipanti && partecipanti.length > 0 && (
              <form action={handleSalva}>
                {partecipanti.map((p) => {
                  const votoEsistente = votoDi(evento.id, p.id);
                  const nome = p.full_name || p.email;
                  const iniziale = nome.trim().charAt(0).toUpperCase();
                  const colore = repartoColor(p.reparto);
                  return (
                    <div key={p.id} className="val-card2">
                      <div className="val-card2-head">
                        <span className="val-avt2" style={{ background: colore }}>{iniziale}</span>
                        <span className="val-card2-name">{nome}</span>
                      </div>
                      <div className="val-params-row">
                        {PARAMETRI.map((param) => (
                          <StarRating
                            key={param.key}
                            name={`${param.key}_${p.id}`}
                            label={param.label}
                            defaultValue={votoEsistente ? votoEsistente[param.key] : 3}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                <button type="submit" className="val-save-btn">
                  {isPending ? "Salvataggio…" : "Salva valutazioni"}
                </button>
                {salvato === evento.id && <p style={{ fontSize: 12, color: "#166534", margin: "10px 0 0" }}>Valutazioni salvate.</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StarRating({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  const [valore, setValore] = useState(defaultValue);

  return (
    <div className="val-param-col">
      <span className="val-param-col-label">{label}</span>
      <div className="val-stars2">
        <input type="hidden" name={name} value={valore} />
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setValore(v)}
            className={`val-star2${v <= valore ? " val-star2-on" : ""}`}
            aria-label={`${v} su 5`}
          >
            {v <= valore ? "★" : "☆"}
          </button>
        ))}
      </div>
    </div>
  );
}
