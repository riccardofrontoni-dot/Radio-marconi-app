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

type Evento = {
  id: string;
  titolo: string;
  quando: string;
  fine: string | null;
  tipo: string;
  membri: string[] | null;
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
  puoCreare,
  eventiConScript,
  isSpeaker,
  isRad,
  userId,
}: {
  anno: number;
  mese: number;
  inizioGriglia: string;
  fineGriglia: string;
  events: Evento[];
  membri: Membro[];
  puoCreare: boolean;
  eventiConScript: string[];
  isSpeaker: boolean;
  isRad: boolean;
  userId: string;
}) {
  const [giornoAperto, setGiornoAperto] = useState<string | null>(null);
  const [modificaId, setModificaId] = useState<string | null>(null);
  const [mostraForm, setMostraForm] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  function apriGiorno(iso: string) {
    setGiornoAperto(iso);
    setModificaId(null);
    setMostraForm(false);
  }
  function chiudi() {
    setGiornoAperto(null);
    setModificaId(null);
    setMostraForm(false);
  }
  function handleElimina(id: string) {
    startTransition(async () => {
      await deleteEvent(id);
    });
  }

  const eventiGiornoAperto = giornoAperto ? eventsPerGiorno[giornoAperto] ?? [] : [];

  return (
    <div>
      {/* --- header signature blu "da radio" --- */}
      <div
        style={{
          position: "relative", overflow: "hidden", borderRadius: 22,
          padding: "34px 32px 30px", marginBottom: 28,
          background: "radial-gradient(120% 140% at 12% 10%, #4CAF6D 0%, #0F3D22 52%, #06140C 100%)",
        }}
      >
        <svg
          width="420" height="420" viewBox="0 0 420 420"
          style={{ position: "absolute", right: -80, top: -110, opacity: 0.2, pointerEvents: "none" }}
        >
          {[70, 118, 166, 214].map((r) => (
            <circle key={r} cx="210" cy="210" r={r} fill="none" stroke="#A9E0BB" strokeWidth="1.5" />
          ))}
        </svg>

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9E0BB", marginBottom: 8, fontWeight: 600 }}>
              Calendario condiviso
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 700, color: "#fff" }}>
              {MESI[mese]} {anno}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href={`/dashboard/calendario?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
            <Link href={`/dashboard/calendario?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 8 }}>
        {GIORNI_SETTIMANA.map((g) => (
          <div key={g} style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-text)", textAlign: "center", padding: "4px 0" }}>
            {g}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {giorni.map((giorno) => {
          const inMese = giorno.getMonth() === mese;
          const isOggi = giorno.toDateString() === today.toDateString();
          const iso = giornoISO(giorno);
          const eventiGiorno = eventsPerGiorno[iso] ?? [];

          return (
            <button
              key={iso}
              onClick={() => apriGiorno(iso)}
              style={{
                display: "block", textAlign: "left", minHeight: 108, borderRadius: 12, padding: 8,
                background: inMese ? "var(--light-bg)" : "transparent",
                border: isOggi ? "2px solid var(--blue)" : "1px solid transparent",
                opacity: inMese ? 1 : 0.35, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: isOggi ? 700 : 500, color: isOggi ? "var(--blue)" : "var(--dark)", marginBottom: 5 }}>
                {giorno.getDate()}
              </div>
              {eventiGiorno.slice(0, 3).map((e) => {
                const primoMembro = e.membri?.[0] ? membroById(e.membri[0]) : undefined;
                const colore = primoMembro ? repartoColor(primoMembro.reparto) : "var(--blue)";
                return (
                  <div
                    key={e.id}
                    style={{
                      fontSize: 11, background: colore,
                      color: "#fff", borderRadius: 6, padding: "3px 6px", marginBottom: 3, overflow: "hidden",
                      whiteSpace: "nowrap", textOverflow: "ellipsis", fontWeight: 500,
                    }}
                  >
                    {e.titolo}
                  </div>
                );
              })}
              {eventiGiorno.length > 3 && (
                <div style={{ fontSize: 10.5, color: "var(--gray-text)" }}>+{eventiGiorno.length - 3} altri</div>
              )}
            </button>
          );
        })}
      </div>

      {/* --- scheda modale del giorno --- */}
      {giornoAperto && (
        <div
          onClick={chiudi}
          className="overlay-fade"
          style={{
            position: "fixed", inset: 0, background: "rgba(6,11,28,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-pop"
            style={{
              background: "var(--white)", borderRadius: 20, padding: 26, width: "100%", maxWidth: 500,
              maxHeight: "82vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 18 }}>
                {new Date(giornoAperto).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <button onClick={chiudi} style={{ border: "none", background: "var(--light-bg)", width: 30, height: 30, borderRadius: "50%", fontSize: 15, color: "var(--gray-text)", cursor: "pointer" }}>✕</button>
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
                  onSalva={(formData) => {
                    startTransition(async () => {
                      await updateEvent(e.id, formData);
                      setModificaId(null);
                    });
                  }}
                  onAnnulla={() => setModificaId(null)}
                />
              ) : (
                <div key={e.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 600 }}>{e.titolo}</div>
                      <div style={{ fontSize: 12.5, color: "var(--gray-text)", marginTop: 3 }}>
                        {new Date(e.quando).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                        {e.fine && ` – ${new Date(e.fine).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`}
                      </div>
                      {e.membri && e.membri.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
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
                      <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
                        {eventiConScript.includes(e.id) ? (
                          <a href={`/dashboard/script/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                            📄 Script puntata
                          </a>
                        ) : (isRad || (isSpeaker && (e.membri ?? []).includes(userId))) ? (
                          <a href={`/dashboard/script/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-text)" }}>
                            + Crea script
                          </a>
                        ) : null}
                        {e.tipo === "diretta" && eventiConScript.includes(e.id) && (isRad || (isSpeaker && (e.membri ?? []).includes(userId))) && (
                          <a href={`/dashboard/timer/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                            ⏱ Timer diretta
                          </a>
                        )}
                      </div>
                    </div>
                    {puoCreare && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setModificaId(e.id)} style={smallBtnStyle}>Modifica</button>
                        <button onClick={() => handleElimina(e.id)} style={{ ...smallBtnStyle, color: "#c22", borderColor: "#f3c2c2" }}>
                          Elimina
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {puoCreare && mostraForm && (
              <EventoForm
                giornoISOdefault={giornoAperto}
                membri={membri}
                onSalva={(formData) => {
                  startTransition(async () => {
                    await createEvent(formData);
                    setMostraForm(false);
                  });
                }}
                onAnnulla={() => setMostraForm(false)}
              />
            )}

            {puoCreare && !mostraForm && !modificaId && (
              <button onClick={() => setMostraForm(true)} className="btn-primary" style={{ width: "100%", marginTop: 6 }}>
                + Aggiungi evento
              </button>
            )}
            {isPending && <p className="placeholder-note" style={{ marginTop: 8 }}>Salvataggio…</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function EventoForm({
  evento,
  giornoISOdefault,
  membri,
  onSalva,
  onAnnulla,
}: {
  evento?: Evento;
  giornoISOdefault: string;
  membri: Membro[];
  onSalva: (formData: FormData) => void;
  onAnnulla: () => void;
}) {
  const oraDefault = evento ? new Date(evento.quando).toTimeString().slice(0, 5) : "";
  const oraFineDefault = evento?.fine ? new Date(evento.fine).toTimeString().slice(0, 5) : "";
  const membriDefault = evento?.membri ?? [];

  const gruppi = REPARTI.map((r) => ({
    ...r,
    persone: membri.filter((m) => m.reparto === r.value),
  })).filter((g) => g.persone.length > 0);

  return (
    <form
      action={(formData) => onSalva(formData)}
      style={{ background: "var(--light-bg)", borderRadius: 14, padding: 16, display: "grid", gap: 10, marginBottom: 10 }}
    >
      <div>
        <label style={labelStyle}>Titolo</label>
        <input name="titolo" type="text" required defaultValue={evento?.titolo} placeholder="Es. Diretta Speaker" style={inputStyle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Data</label>
          <input name="data" type="date" required defaultValue={giornoISOdefault} style={inputStyle} />
        </div>
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
        <select name="tipo" defaultValue={evento?.tipo ?? "diretta"} style={inputStyle}>
          <option value="diretta">Diretta</option>
          <option value="riunione">Riunione</option>
          <option value="altro">Altro</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Persone coinvolte</label>
        {gruppi.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--gray-text)", margin: 0 }}>
            Nessun membro attivo ancora — assegna reparti dalla sezione Membri.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto", padding: "2px 2px" }}>
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
                    <input type="checkbox" name="membri" value={p.id} defaultChecked={membriDefault.includes(p.id)} />
                    {p.full_name || p.email}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
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
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border)",
  fontSize: 13.5, fontFamily: "inherit", background: "var(--white)",
};
