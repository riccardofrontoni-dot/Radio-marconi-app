"use client";

import { useState, useTransition } from "react";
import { creaEventoRad, eliminaEventoRad } from "@/lib/actions";
import { REPARTI, repartoColor, repartoLabel } from "@/lib/reparti";

const STATO_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  in_corso: { label: "In corso", bg: "#DBEAFE", fg: "#1E40AF" },
  completato: { label: "Completato", bg: "#DCFCE7", fg: "#166534" },
  archiviato: { label: "Archiviato", bg: "#F1F1F3", fg: "#6E6E73" },
};

export default function EventiClient({ eventi, membri, sonoRad }: { eventi: any[]; membri: any[]; sonoRad: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [mostraForm, setMostraForm] = useState(false);
  const [aperto, setAperto] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [repartiScelti, setRepartiScelti] = useState<string[]>([]);
  const [personeScelte, setPersoneScelte] = useState<string[]>([]);

  function mostraToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }
  function toggleReparto(v: string) {
    setRepartiScelti((r) => (r.includes(v) ? r.filter((x) => x !== v) : [...r, v]));
  }
  function togglePersona(id: string) {
    setPersoneScelte((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function salva(formData: FormData) {
    repartiScelti.forEach((r) => formData.append("reparti_coinvolti", r));
    personeScelte.forEach((p) => formData.append("persone_coinvolte", p));
    startTransition(async () => {
      await creaEventoRad(formData);
      mostraToast("Evento creato");
      setMostraForm(false);
      setRepartiScelti([]);
      setPersoneScelte([]);
    });
  }
  function elimina(id: string, documentoPath: string | null, eventoCalendarioId: string | null) {
    startTransition(async () => {
      await eliminaEventoRad(id, documentoPath, eventoCalendarioId);
      mostraToast("Evento eliminato");
    });
  }

  const membriFiltrati = repartiScelti.length ? membri.filter((m) => repartiScelti.includes(m.reparto ?? "")) : membri;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Eventi</h2>
        {sonoRad && (
          <button onClick={() => setMostraForm(!mostraForm)} className="btn-primary" style={{ fontSize: 12.5 }}>
            {mostraForm ? "Annulla" : "+ Nuovo evento"}
          </button>
        )}
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Grandi iniziative organizzate dal RAD — con task, materiali, divisione dei compiti e scadenze proprie.
      </p>

      {mostraForm && (
        <form action={salva} style={{ background: "var(--light-bg)", borderRadius: 14, padding: 18, display: "grid", gap: 12, marginBottom: 24, maxWidth: 600 }}>
          <div>
            <label style={labelStyle}>Nome evento</label>
            <input name="nome" type="text" required placeholder="Es. Giornata della Comunicazione" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Partenza</label>
              <input name="data_inizio" type="date" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Scadenza</label>
              <input name="data_scadenza" type="date" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Reparti coinvolti</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REPARTI.map((r) => (
                <button
                  type="button" key={r.value} onClick={() => toggleReparto(r.value)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                    border: `1px solid ${repartiScelti.includes(r.value) ? r.color : "var(--border)"}`,
                    background: repartiScelti.includes(r.value) ? r.color : "var(--white)",
                    color: repartiScelti.includes(r.value) ? "#fff" : "var(--dark)",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Persone coinvolte {repartiScelti.length > 0 && "(dei reparti scelti)"}</label>
            <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10, background: "var(--white)" }}>
              {membriFiltrati.map((m: any) => (
                <div
                  key={m.id} onClick={() => togglePersona(m.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "7px 12px", cursor: "pointer", fontSize: 12.5,
                    background: personeScelte.includes(m.id) ? "#E5F4EA" : "transparent",
                    color: personeScelte.includes(m.id) ? "var(--blue)" : "var(--dark)",
                    fontWeight: personeScelte.includes(m.id) ? 600 : 400,
                  }}
                >
                  {m.full_name || m.email}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descrizione</label>
            <textarea name="descrizione" placeholder="Di cosa si tratta l'evento..." style={{ ...inputStyle, minHeight: 70 }} />
          </div>
          <div>
            <label style={labelStyle}>Documento/programma (PDF, facoltativo)</label>
            <input name="documento" type="file" accept="application/pdf" style={{ fontSize: 12.5 }} />
          </div>
          <button type="submit" disabled={isPending} className="btn-primary">{isPending ? "Salvataggio…" : "Crea evento"}</button>
        </form>
      )}

      {eventi.length === 0 && !mostraForm && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun evento ancora.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {eventi.map((e) => {
          const isOpen = aperto === e.id;
          return (
            <div key={e.id} className="card" style={{ overflow: "hidden" }}>
              <button
                onClick={() => setAperto(isOpen ? null : e.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{e.nome}</div>
                  {e.descrizione && (
                    <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.descrizione}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: STATO_LABEL[e.stato].bg, color: STATO_LABEL[e.stato].fg, flexShrink: 0 }}>
                  {STATO_LABEL[e.stato].label}
                </span>
                <span style={{ fontSize: 11, color: "var(--gray-text)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>▾</span>
              </button>

              {isOpen && (
                <div style={{ padding: "0 18px 18px" }}>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12, fontSize: 12.5 }}>
                    <div><b>Partenza:</b> {e.data_inizio ? new Date(e.data_inizio).toLocaleDateString("it-IT") : "—"}</div>
                    <div><b>Scadenza:</b> {e.data_scadenza ? new Date(e.data_scadenza).toLocaleDateString("it-IT") : "—"}</div>
                  </div>
                  {e.reparti_coinvolti?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                      {e.reparti_coinvolti.map((r: string) => (
                        <span key={r} style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: repartoColor(r), borderRadius: 999, padding: "3px 9px" }}>{repartoLabel(r)}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <a href={`/dashboard/eventi/${e.id}`} className="btn-primary" style={{ fontSize: 12, padding: "7px 14px", textDecoration: "none", background: "var(--dark)" }}>
                      Apri workspace →
                    </a>
                    {e.documentoUrl && (
                      <a href={e.documentoUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: 12, padding: "7px 14px", textDecoration: "none" }}>
                        Scarica il documento
                      </a>
                    )}
                    {sonoRad && (
                      <button onClick={() => elimina(e.id, e.documento_path, e.evento_calendario_id)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                        Elimina evento
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "fixed", bottom: 26, right: 26, background: "var(--dark)", color: "#fff", padding: "13px 18px",
          borderRadius: 13, fontSize: 13.5, display: "flex", alignItems: "center", gap: 10,
          transform: toast ? "translateY(0)" : "translateY(140%)", transition: "transform 0.3s cubic-bezier(.22,.9,.32,1)", zIndex: 50,
          boxShadow: "0 14px 30px -10px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
