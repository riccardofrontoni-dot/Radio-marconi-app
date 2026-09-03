"use client";

import { useState, useTransition } from "react";
import { creaProgetto, eliminaProgetto } from "@/lib/actions";
import { REPARTI, repartoColor, repartoLabel } from "@/lib/reparti";

const PROF_SUGGERITI = ["Mandrici", "Onofri", "Staian"];

type Membro = { id: string; full_name: string | null; email: string; reparto: string | null };
type Progetto = {
  id: string;
  nome: string;
  descrizione: string | null;
  data_inizio: string | null;
  data_scadenza: string | null;
  reparti_coinvolti: string[];
  persone_coinvolte: string[];
  assegnato_da: string | null;
  bando_path: string | null;
  bandoUrl: string | null;
  evento_id: string | null;
};

export default function ProgettiClient({
  progetti,
  membri,
  nomeProfessore,
}: {
  progetti: Progetto[];
  membri: Membro[];
  nomeProfessore: string;
}) {
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
      await creaProgetto(formData);
      mostraToast("Progetto assegnato");
      setMostraForm(false);
      setRepartiScelti([]);
      setPersoneScelte([]);
    });
  }

  function elimina(id: string, bandoPath: string | null, eventoId: string | null) {
    startTransition(async () => {
      await eliminaProgetto(id, bandoPath, eventoId);
      mostraToast("Progetto eliminato");
    });
  }

  const membriFiltrati = repartiScelti.length ? membri.filter((m) => repartiScelti.includes(m.reparto ?? "")) : membri;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Progetti</h2>
        <button onClick={() => setMostraForm(!mostraForm)} className="btn-primary" style={{ fontSize: 12.5 }}>
          {mostraForm ? "Annulla" : "+ Nuovo progetto"}
        </button>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Progetti assegnati dai professori nel corso dell'anno — con bando scaricabile e collegamento diretto al calendario.
      </p>

      {mostraForm && (
        <form action={salva} style={{ background: "var(--light-bg)", borderRadius: 14, padding: 18, display: "grid", gap: 12, marginBottom: 24, maxWidth: 600 }}>
          <div>
            <label style={labelStyle}>Nome evento</label>
            <input name="nome" type="text" required placeholder="Es. Podcast per la Giornata della Memoria" style={inputStyle} />
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
                  type="button"
                  key={r.value}
                  onClick={() => toggleReparto(r.value)}
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
              {membriFiltrati.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--gray-text)", padding: 12, margin: 0 }}>Nessun membro trovato.</p>
              )}
              {membriFiltrati.map((m) => (
                <div
                  key={m.id}
                  onClick={() => togglePersona(m.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "7px 12px", cursor: "pointer", fontSize: 12.5,
                    background: personeScelte.includes(m.id) ? "#E5F4EA" : "transparent",
                    color: personeScelte.includes(m.id) ? "var(--blue)" : "var(--dark)",
                    fontWeight: personeScelte.includes(m.id) ? 600 : 400,
                  }}
                >
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: repartoColor(m.reparto), color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {(m.full_name || m.email).split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  {m.full_name || m.email}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descrizione</label>
            <textarea name="descrizione" placeholder="Di cosa si tratta il progetto..." style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
          </div>

          <div>
            <label style={labelStyle}>Bando (PDF, facoltativo)</label>
            <input name="bando" type="file" accept="application/pdf" style={{ fontSize: 12.5 }} />
          </div>

          <div>
            <label style={labelStyle}>Assegnato da</label>
            <input name="assegnato_da" type="text" list="prof-suggeriti" defaultValue={nomeProfessore} style={inputStyle} />
            <datalist id="prof-suggeriti">
              {PROF_SUGGERITI.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>

          <button type="submit" disabled={isPending} className="btn-primary" style={{ marginTop: 4 }}>
            {isPending ? "Salvataggio…" : "Assegna progetto"}
          </button>
        </form>
      )}

      {progetti.length === 0 && !mostraForm && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun progetto assegnato ancora.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {progetti.map((p) => {
          const isOpen = aperto === p.id;
          return (
            <div key={p.id} className="card" style={{ overflow: "hidden" }}>
              <button
                onClick={() => setAperto(isOpen ? null : p.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.nome}</div>
                  {p.descrizione && (
                    <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.descrizione}
                    </div>
                  )}
                </div>
                {p.data_scadenza && (
                  <span style={{ fontSize: 11, color: "var(--gray-text)", flexShrink: 0 }}>
                    entro {new Date(p.data_scadenza).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--gray-text)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>▾</span>
              </button>

              {isOpen && (
                <div style={{ padding: "0 18px 18px" }}>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12, fontSize: 12.5 }}>
                    <div><b>Partenza:</b> {p.data_inizio ? new Date(p.data_inizio).toLocaleDateString("it-IT") : "—"}</div>
                    <div><b>Scadenza:</b> {p.data_scadenza ? new Date(p.data_scadenza).toLocaleDateString("it-IT") : "—"}</div>
                    <div><b>Assegnato da:</b> {p.assegnato_da || "—"}</div>
                  </div>

                  {p.reparti_coinvolti.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                      {p.reparti_coinvolti.map((r) => (
                        <span key={r} style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: repartoColor(r), borderRadius: 999, padding: "3px 9px" }}>
                          {repartoLabel(r)}
                        </span>
                      ))}
                    </div>
                  )}

                  {p.persone_coinvolte.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                      {p.persone_coinvolte.map((id) => {
                        const m = membri.find((mm) => mm.id === id);
                        if (!m) return null;
                        return (
                          <span key={id} style={{ fontSize: 10.5, fontWeight: 600, background: "var(--light-bg)", borderRadius: 999, padding: "3px 9px" }}>
                            {m.full_name || m.email}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {p.descrizione && <p style={{ fontSize: 13, marginBottom: 14 }}>{p.descrizione}</p>}

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {p.bandoUrl && (
                      <a href={p.bandoUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: 12, padding: "7px 14px", textDecoration: "none" }}>
                        Scarica il bando
                      </a>
                    )}
                    <button onClick={() => elimina(p.id, p.bando_path, p.evento_id)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                      Elimina progetto
                    </button>
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
