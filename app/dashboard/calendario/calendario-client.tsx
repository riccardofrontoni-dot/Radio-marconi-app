"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createEvent, updateEvent, deleteEvent } from "@/lib/actions";
import { REPARTI, repartoColor, repartoLabel } from "@/lib/reparti";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const GIORNI_SETTIMANA = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const TIPO_LABEL: Record<string, string> = { diretta: "Diretta", riunione: "Riunione", registrazione: "Registrazione", altro: "Altro", progetto: "Progetto", formazione: "Formazione" };
const TIPO_COLORE: Record<string, string> = { diretta: "#2C7A45", riunione: "#8A6D3B", registrazione: "#6B4FA0", altro: "#6E6E73", progetto: "#B45309", formazione: "#0369A1" };

type Evento = {
  id: string;
  titolo: string;
  quando: string;
  fine: string | null;
  tipo: string;
  membri: string[] | null;
  reparti_coinvolti: string[] | null;
  descrizione: string | null;
};
type FormatDiretta = {
  id: string;
  reparto: string;
  nome: string;
  membri: string[];
};
type Membro = {
  id: string;
  full_name: string | null;
  email: string;
  reparto: string | null;
};

export default function CalendarioClient({
  anno,
  mese,
  inizioGriglia,
  fineGriglia,
  events,
  membri,
  formats,
  materialePerEvento,
  puoCreare,
  eventiConScript,
  eventiConScriptSocial,
  isSpeaker,
  isSocial,
  isRad,
  userId,
}: {
  anno: number;
  mese: number;
  inizioGriglia: string;
  fineGriglia: string;
  events: Evento[];
  membri: Membro[];
  formats: FormatDiretta[];
  materialePerEvento: Record<string, { url: string | null; nome: string }>;
  puoCreare: boolean;
  eventiConScript: string[];
  eventiConScriptSocial: string[];
  isSpeaker: boolean;
  isSocial: boolean;
  isRad: boolean;
  userId: string;
}) {
  const [giornoAperto, setGiornoAperto] = useState<string | null>(null);
  const [eventoEspanso, setEventoEspanso] = useState<string | null>(null);
  const [modificaId, setModificaId] = useState<string | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const membroById = (id: string) => membri.find((m) => m.id === id);
  const nomeMembro = (m: Membro) => m.full_name || m.email;

  const today = new Date();
  const giornoISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const giorni: Date[] = [];
  for (let d = new Date(inizioGriglia); d <= new Date(fineGriglia); d.setDate(d.getDate() + 1)) {
    giorni.push(new Date(d));
  }

  const eventsPerGiorno: Record<string, Evento[]> = {};
  events.forEach((e) => {
    const key = giornoISO(new Date(e.quando));
    (eventsPerGiorno[key] ??= []).push(e);
  });

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  function mostraToast(testo: string) {
    setToast(testo);
    setTimeout(() => setToast(null), 2600);
  }

  function apriGiorno(iso: string) {
    setGiornoAperto(iso);
    setEventoEspanso(null);
    setModificaId(null);
    setMostraForm(false);
  }
  function chiudi() {
    setGiornoAperto(null);
    setEventoEspanso(null);
    setModificaId(null);
    setMostraForm(false);
  }
  function handleElimina(id: string) {
    startTransition(async () => {
      await deleteEvent(id);
      mostraToast("Evento eliminato");
    });
  }

  const eventiGiornoAperto = giornoAperto ? eventsPerGiorno[giornoAperto] ?? [] : [];

  return (
    <div className="calendario-layout" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 760px", minWidth: 0 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden", background: "var(--white)" }}>
          {/* --- striscia verde slim --- */}
          <div
            className="calendar-header-band"
            style={{ background: "var(--blue)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <h2 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 700, textTransform: "capitalize" }}>
              {MESI[mese]} {anno}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link href={`/dashboard/calendario?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
              <Link href={`/dashboard/calendario?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 8 }}>
              {GIORNI_SETTIMANA.map((g) => (
                <div key={g} className="dow-label" style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-text)", textAlign: "center", padding: "4px 0" }}>
                  {g}
                </div>
              ))}
            </div>

            <div className="calendar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {giorni.map((giorno) => {
                const inMese = giorno.getMonth() === mese;
                const isOggi = giorno.toDateString() === today.toDateString();
                const iso = giornoISO(giorno);
                const eventiGiorno = eventsPerGiorno[iso] ?? [];
                const isSelezionato = giornoAperto === iso;

                return (
                  <button
                    key={iso}
                    onClick={() => apriGiorno(iso)}
                    className={`calendar-day${eventiGiorno.length ? " has-events" : ""}`}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                      textAlign: "center", minHeight: 96, borderRadius: 14, padding: "12px 6px",
                      background: isSelezionato ? "var(--light-bg)" : inMese ? "var(--white)" : "transparent",
                      border: isOggi ? "1.5px solid var(--blue)" : isSelezionato ? "1px solid var(--blue)" : "1px solid var(--border)",
                      opacity: inMese ? 1 : 0.35, cursor: "pointer", fontFamily: "inherit",
                      transition: "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
                    }}
                    onMouseEnter={(e) => { if (inMese) { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 24px -12px rgba(15,61,34,0.25)"; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div className="day-num" style={{ fontSize: 17, fontWeight: isOggi ? 700 : 500, color: isOggi ? "var(--blue)" : "var(--dark)" }}>
                      {giorno.getDate()}
                    </div>
                    {eventiGiorno.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 8, maxWidth: 56 }}>
                        {eventiGiorno.slice(0, 6).map((e) => (
                          <span key={e.id} style={{ width: 7, height: 7, borderRadius: "50%", background: TIPO_COLORE[e.tipo] ?? "var(--blue)", flexShrink: 0 }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* --- pannello fisso a destra: legenda, o dettaglio del giorno --- */}
      <div className="calendario-panel" style={{ flex: "0 0 400px", width: 400 }}>
        <div className="card" style={{ padding: 26, position: "sticky", top: 20, maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
          {!giornoAperto ? (
            <>
              <div className="section-label" style={{ marginTop: 0 }}>Legenda</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 18 }}>
                {Object.entries(TIPO_LABEL).map(([key, label]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 11, height: 11, borderRadius: "50%", background: TIPO_COLORE[key], flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{label}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "var(--gray-text)", margin: 0, fontStyle: "italic" }}>
                Clicca un giorno per vedere gli eventi.
              </p>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h3 style={{ fontSize: 17, fontFamily: "Georgia, serif", textTransform: "capitalize" }}>
                  {new Date(giornoAperto).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                <button onClick={chiudi} style={{ border: "none", background: "var(--light-bg)", width: 28, height: 28, borderRadius: "50%", fontSize: 14, color: "var(--gray-text)", cursor: "pointer", flexShrink: 0 }}>✕</button>
              </div>

              {eventiGiornoAperto.length === 0 && !mostraForm && (
                <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun evento in questo giorno.</p>
              )}

              {eventiGiornoAperto.map((e) =>
                modificaId === e.id ? (
                  <EventoForm
                    key={e.id}
                    giornoISOdefault={giornoAperto}
                    evento={e}
                    membri={membri}
                    formats={formats}
                    onSalva={(formData) => {
                      startTransition(async () => {
                        await updateEvent(e.id, formData);
                        setModificaId(null);
                        mostraToast("Evento aggiornato");
                      });
                    }}
                    onAnnulla={() => setModificaId(null)}
                  />
                ) : (
                  <div key={e.id} style={{ background: "var(--light-bg)", borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
                    <button
                      onClick={() => setEventoEspanso(eventoEspanso === e.id ? null : e.id)}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    >
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: TIPO_COLORE[e.tipo] ?? "var(--blue)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.titolo}</div>
                        <div style={{ fontSize: 11.5, color: "var(--gray-text)" }}>
                          {TIPO_LABEL[e.tipo] ?? e.tipo} · {new Date(e.quando).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                          {e.fine && `–${new Date(e.fine).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--gray-text)", transform: eventoEspanso === e.id ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>▾</span>
                    </button>

                    {eventoEspanso === e.id && (
                      <div style={{ padding: "0 14px 14px" }}>
                        {e.descrizione && (
                          <p style={{ fontSize: 12.5, color: "var(--dark)", margin: "0 0 10px" }}>{e.descrizione}</p>
                        )}
                        {e.tipo === "formazione" && e.reparti_coinvolti && e.reparti_coinvolti.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                            {e.reparti_coinvolti.map((r) => (
                              <span key={r} style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", background: repartoColor(r), borderRadius: 999, padding: "3px 9px" }}>
                                {repartoLabel(r)}
                              </span>
                            ))}
                          </div>
                        )}
                        {e.tipo !== "formazione" && e.membri && e.membri.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                            {e.membri.map((id) => {
                              const m = membroById(id);
                              if (!m) return null;
                              return (
                                <span key={id} style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", background: repartoColor(m.reparto), borderRadius: 999, padding: "3px 9px" }}>
                                  {nomeMembro(m)}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: puoCreare ? 12 : 0 }}>
                          {e.tipo === "diretta" && (
                            eventiConScript.includes(e.id) ? (
                              <a href={`/dashboard/script/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                                📄 Script puntata
                              </a>
                            ) : (isRad || (isSpeaker && (e.membri ?? []).includes(userId))) ? (
                              <a href={`/dashboard/script/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-text)" }}>
                                + Crea script
                              </a>
                            ) : null
                          )}
                          {e.tipo === "diretta" && eventiConScript.includes(e.id) && (isRad || (isSpeaker && (e.membri ?? []).includes(userId))) && (
                            <a href={`/dashboard/timer/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                              ⏱ Timer diretta
                            </a>
                          )}
                          {e.tipo === "riunione" && isRad && (
                            <a href={`/dashboard/punti-riunione/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                              📋 Punti da discutere
                            </a>
                          )}
                          {e.tipo === "registrazione" && (
                            eventiConScriptSocial.includes(e.id) ? (
                              <a href={`/dashboard/social-script/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                                📱 Script social
                              </a>
                            ) : (isRad || (isSocial && (e.membri ?? []).includes(userId))) ? (
                              <a href={`/dashboard/social-script/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-text)" }}>
                                + Crea script social
                              </a>
                            ) : null
                          )}
                          {e.tipo === "formazione" && (
                            materialePerEvento[e.id]?.url ? (
                              <a href={materialePerEvento[e.id].url!} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                                📎 Apri il materiale
                              </a>
                            ) : (
                              <a href="/dashboard/materiali" style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-text)" }}>
                                Nessun materiale ancora — vai su Materiali
                              </a>
                            )
                          )}
                        </div>

                        {puoCreare && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setModificaId(e.id)} style={smallBtnStyle}>Modifica</button>
                            <button onClick={() => handleElimina(e.id)} style={{ ...smallBtnStyle, color: "#c22", borderColor: "#f3c2c2" }}>
                              Elimina
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}

              {puoCreare && mostraForm && (
                <EventoForm
                  giornoISOdefault={giornoAperto}
                  membri={membri}
                  formats={formats}
                  onSalva={(formData) => {
                    startTransition(async () => {
                      await createEvent(formData);
                      setMostraForm(false);
                      mostraToast("Evento salvato");
                    });
                  }}
                  onAnnulla={() => setMostraForm(false)}
                />
              )}

              {puoCreare && !mostraForm && !modificaId && (
                <button onClick={() => setMostraForm(true)} style={aggiungiBtnStyle}>
                  + Aggiungi evento
                </button>
              )}
              {isPending && <p className="placeholder-note" style={{ marginTop: 8 }}>Salvataggio…</p>}
            </>
          )}
        </div>
      </div>

      {/* --- toast --- */}
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

function EventoForm({
  evento,
  giornoISOdefault,
  membri,
  formats,
  onSalva,
  onAnnulla,
}: {
  evento?: Evento;
  giornoISOdefault: string;
  membri: Membro[];
  formats: FormatDiretta[];
  onSalva: (formData: FormData) => void;
  onAnnulla: () => void;
}) {
  const oraDefault = evento ? new Date(evento.quando).toTimeString().slice(0, 5) : "";
  const oraFineDefault = evento?.fine ? new Date(evento.fine).toTimeString().slice(0, 5) : "";

  const [tipo, setTipo] = useState(evento?.tipo ?? "diretta");
  const [titolo, setTitolo] = useState(evento?.titolo ?? "");
  const [membriScelti, setMembriScelti] = useState<string[]>(evento?.membri ?? []);
  const [repartiScelti, setRepartiScelti] = useState<string[]>(evento?.reparti_coinvolti ?? []);
  const [invioATutti, setInvioATutti] = useState(false);

  const gruppi = REPARTI.map((r) => ({
    ...r,
    persone: membri.filter((m) => m.reparto === r.value),
  })).filter((g) => g.persone.length > 0);

  function toggleMembro(id: string) {
    setMembriScelti((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function toggleReparto(v: string) {
    setRepartiScelti((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }
  function scegliFormat(formatId: string) {
    const f = formats.find((x) => x.id === formatId);
    if (!f) return;
    setTitolo(f.nome);
    setMembriScelti(f.membri);
  }

  return (
    <form
      action={(formData) => onSalva(formData)}
      style={{ background: "var(--light-bg)", borderRadius: 14, padding: 16, display: "grid", gap: 10, marginBottom: 10 }}
    >
      <div>
        <label style={labelStyle}>Titolo</label>
        <input name="titolo" type="text" required value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Diretta Speaker" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Data</label>
        <input name="data" type="date" required defaultValue={giornoISOdefault} style={inputStyle} />
      </div>
      <div className="grid-stack-mobile-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Inizio</label>
          <input name="ora" type="time" defaultValue={oraDefault} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fine</label>
          <input name="ora_fine" type="time" defaultValue={oraFineDefault} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Tipo</label>
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
          <option value="diretta">Diretta</option>
          <option value="riunione">Riunione</option>
          <option value="registrazione">Giornata di registrazione</option>
          <option value="formazione">Formazione</option>
          <option value="altro">Altro</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Descrizione (facoltativa)</label>
        <textarea name="descrizione" defaultValue={evento?.descrizione ?? ""} placeholder="Dettagli sull'evento..." style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
      </div>

      {tipo === "diretta" && formats.length > 0 && (
        <div>
          <label style={labelStyle}>Format (facoltativo — precompila titolo e speaker)</label>
          <select onChange={(e) => scegliFormat(e.target.value)} defaultValue="" style={inputStyle}>
            <option value="">— Scegli un format —</option>
            {formats.map((f) => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>
      )}

      {tipo === "riunione" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--white)", borderRadius: 10, padding: "10px 12px" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Invia a tutti i membri</span>
          <button
            type="button"
            onClick={() => setInvioATutti(!invioATutti)}
            style={{ width: 38, height: 22, borderRadius: 20, border: "none", cursor: "pointer", position: "relative", background: invioATutti ? "var(--blue)" : "#d7dae3" }}
          >
            <input type="hidden" name="invia_a_tutti" value={invioATutti ? "on" : "off"} />
            <span style={{ position: "absolute", top: 2, left: invioATutti ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
          </button>
        </div>
      )}

      {tipo === "formazione" ? (
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
          {repartiScelti.map((r) => <input key={r} type="hidden" name="reparti_coinvolti" value={r} />)}
        </div>
      ) : !invioATutti ? (
        <div>
          <label style={labelStyle}>Persone coinvolte</label>
          {gruppi.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--gray-text)", margin: 0 }}>
              Nessun membro attivo ancora — assegna reparti dalla sezione Membri.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto", padding: "2px 2px" }}>
            {gruppi.map((g) => (
              <div key={g.value}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: g.color, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 4 }}>
                  {g.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {g.persone.map((p) => (
                    <label
                      key={p.id}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 999, padding: "5px 10px" }}
                    >
                      <input type="checkbox" checked={membriScelti.includes(p.id)} onChange={() => toggleMembro(p.id)} />
                      {p.full_name || p.email}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {membriScelti.map((id) => <input key={id} type="hidden" name="membri" value={id} />)}
        </div>
      ) : (
        <p style={{ fontSize: 11.5, color: "var(--gray-text)", fontStyle: "italic", margin: 0 }}>
          Verranno coinvolti tutti i membri attivi della dashboard.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button type="submit" className="btn-primary" style={{ flex: 1 }}>Salva</button>
        <button type="button" onClick={onAnnulla} style={{ padding: "10px 16px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--white)", fontSize: 13 }}>
          Annulla
        </button>
      </div>
    </form>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontSize: 20, color: "#fff", padding: "6px 14px", borderRadius: 9, background: "rgba(255,255,255,0.12)",
};
const smallBtnStyle: React.CSSProperties = {
  fontSize: 12, padding: "6px 11px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--white)", cursor: "pointer",
};
const aggiungiBtnStyle: React.CSSProperties = {
  border: "1px dashed var(--border)", background: "var(--light-bg)", borderRadius: 10, padding: 10, width: "100%",
  fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "var(--dark)", marginTop: 6,
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border)",
  fontSize: 13.5, fontFamily: "inherit", background: "var(--white)",
};
