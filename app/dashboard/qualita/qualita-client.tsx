"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { upsertQualityReport } from "@/lib/actions";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const TIPO_LABEL: Record<string, string> = { diretta: "Diretta", riunione: "Riunione", altro: "Altro" };
const STATO_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  in_revisione: { label: "In revisione", bg: "#FEF3C7", fg: "#92400E" },
  rimandato: { label: "Rimandato — da correggere", bg: "#FEE2E2", fg: "#991B1B" },
  approvato: { label: "Approvato", bg: "#DCFCE7", fg: "#166534" },
};

type Evento = { id: string; titolo: string; quando: string; tipo: string };
type Resoconto = {
  evento_id: string; puntata_titolo: string; punti_di_forza: string | null;
  criticita: string | null; voto: number; stato: string; feedback_rad: string | null;
};

export default function QualitaClient({
  anno, mese, eventi, resoconti,
}: {
  anno: number; mese: number; eventi: Evento[]; resoconti: Resoconto[];
}) {
  const [eventoAperto, setEventoAperto] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [salvato, setSalvato] = useState<string | null>(null);

  const resocontoDi = (eventoId: string) => resoconti.find((r) => r.evento_id === eventoId);

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

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
  const resoconto = evento ? resocontoDi(evento.id) : undefined;

  function handleSalva(formData: FormData) {
    if (!evento) return;
    startTransition(async () => {
      await upsertQualityReport(evento.id, formData);
      setSalvato(evento.id);
      setTimeout(() => setSalvato(null), 2000);
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Resoconto puntata</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/dashboard/qualita?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/qualita?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Dirette e riunioni del mese. Apri una puntata per scrivere o modificare il resoconto.
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
              const r = resocontoDi(e.id);
              const stato = r ? STATO_LABEL[r.stato] : null;
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
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: stato ? stato.bg : "var(--light-bg)",
                      color: stato ? stato.fg : "var(--gray-text)",
                    }}
                  >
                    {stato ? stato.label : "Nessun resoconto"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* --- scheda del resoconto --- */}
      {evento && (
        <div
          onClick={() => setEventoAperto(null)}
          className="overlay-fade"
          style={{ position: "fixed", inset: 0, background: "rgba(6,11,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop"
            style={{ background: "var(--white)", borderRadius: 20, padding: 26, width: "100%", maxWidth: 540, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{evento.titolo}</h3>
              <button onClick={() => setEventoAperto(null)} style={{ border: "none", background: "var(--light-bg)", width: 30, height: 30, borderRadius: "50%", fontSize: 15, color: "var(--gray-text)", cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--gray-text)", marginBottom: 16 }}>
              {new Date(evento.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {resoconto?.feedback_rad && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Feedback del RAD</div>
                <p style={{ fontSize: 12.5, color: "#78350F", margin: 0 }}>{resoconto.feedback_rad}</p>
              </div>
            )}

            <form action={handleSalva} style={{ display: "grid", gap: 14 }}>
              <input type="hidden" name="puntata_titolo" value={evento.titolo} />
              <div>
                <label style={labelStyle}>Punti di forza</label>
                <textarea name="punti_di_forza" defaultValue={resoconto?.punti_di_forza ?? ""} placeholder="Cosa ha funzionato bene" style={{ ...inputStyle, minHeight: 70 }} />
              </div>
              <div>
                <label style={labelStyle}>Criticità</label>
                <textarea name="criticita" defaultValue={resoconto?.criticita ?? ""} placeholder="Cosa migliorare per la prossima volta" style={{ ...inputStyle, minHeight: 70 }} />
              </div>
              <div>
                <label style={labelStyle}>Voto complessivo della puntata</label>
                <select name="voto" defaultValue={String(resoconto?.voto ?? 4)} style={inputStyle}>
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary">
                {isPending ? "Salvataggio…" : resoconto ? "Aggiorna resoconto" : "Salva resoconto"}
              </button>
              {salvato === evento.id && <p style={{ fontSize: 12, color: "#166534", textAlign: "center", margin: 0 }}>Resoconto salvato.</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontSize: 16, color: "var(--dark)", padding: "3px 10px", borderRadius: 7, background: "var(--light-bg)",
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
