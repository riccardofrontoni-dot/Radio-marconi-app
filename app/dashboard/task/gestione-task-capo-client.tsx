"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/lib/actions";
import { REPARTI } from "@/lib/reparti";
import TaskAccordionList from "./task-accordion";
import PanoramicaPersone from "../panoramica-persone";

type Task = {
  id: string;
  titolo: string;
  descrizione: string | null;
  completato: boolean;
  stato: string;
  assegnato_a: string | null;
  reparto: string;
  data_inizio: string | null;
  puntata_data: string | null;
};
type Membro = { id: string; full_name: string | null; email: string; reparto: string; ruolo: string };
type Urgenza = "ritardo" | "urgente" | "tranquillo";

function classificaUrgenza(t: { completato: boolean; puntata_data: string | null }): Urgenza | null {
  if (t.completato) return null;
  if (!t.puntata_data) return "tranquillo";
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const scadenza = new Date(t.puntata_data);
  const traDueGiorni = new Date(oggi);
  traDueGiorni.setDate(oggi.getDate() + 2);
  if (scadenza < oggi) return "ritardo";
  if (scadenza <= traDueGiorni) return "urgente";
  return "tranquillo";
}

function statoPersona(taskPersona: Task[]): "critico" | "attenzione" | "buono" {
  const aperte = taskPersona.filter((t) => !t.completato);
  if (aperte.some((t) => classificaUrgenza(t) === "ritardo")) return "critico";
  if (aperte.some((t) => classificaUrgenza(t) === "urgente")) return "attenzione";
  return "buono";
}

const STATO_COLORE = { critico: "#DC2626", attenzione: "#D97706", buono: "#16A34A" };

export default function GestioneTaskCapoClient({
  profile, membri, tasks, modalitaRad, capiReparto,
}: {
  profile: { id: string; reparto: string | null };
  membri: Membro[];
  tasks: Task[];
  modalitaRad?: boolean;
  capiReparto?: { id: string; full_name: string | null; email: string; ruolo: string; reparto: string | null }[];
}) {
  const [tab, setTab] = useState<"persone" | "crea" | "vista" | "panoramica">("persone");
  const [repartoFiltro, setRepartoFiltro] = useState<string>("tutti");

  const membriFiltrati = modalitaRad && repartoFiltro !== "tutti" ? membri.filter((m) => m.reparto === repartoFiltro) : membri;
  const tasksFiltrati = modalitaRad && repartoFiltro !== "tutti" ? tasks.filter((t) => t.reparto === repartoFiltro) : tasks;

  return (
    <div>
      <div className="fade-in-up fade-in-up-1">
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>Gestione task</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 20 }}>
          {modalitaRad ? "Assegna e tieni traccia delle task di tutti i reparti." : "Assegna task ai membri del tuo reparto e tieni traccia dell'avanzamento."}
        </p>
      </div>

      <div className="fade-in-up fade-in-up-2" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--light-bg)", borderRadius: 10, padding: 4, maxWidth: 640 }}>
          {(modalitaRad
            ? (["persone", "crea", "vista", "panoramica"] as const)
            : (["persone", "crea", "vista"] as const)
          ).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: "1 0 auto", padding: "9px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
                transition: "background 0.2s ease, color 0.2s ease",
                background: tab === t ? "var(--white)" : "transparent",
                color: tab === t ? "var(--dark)" : "var(--gray-text)",
              }}
            >
              {t === "persone" ? "Task per persona" : t === "crea" ? "Crea e assegna" : t === "vista" ? "Vista generale" : "Panoramica"}
            </button>
          ))}
        </div>

        {modalitaRad && (tab === "persone" || tab === "vista") && (
          <select
            value={repartoFiltro}
            onChange={(e) => setRepartoFiltro(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border)", fontSize: 12.5, fontFamily: "inherit", background: "var(--white)" }}
          >
            <option value="tutti">Tutti i reparti</option>
            {REPARTI.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        )}
      </div>

      <div key={tab}>
        {tab === "persone" && <TabPersone membri={membriFiltrati} tasks={tasksFiltrati} profile={profile} raggruppaPerReparto={modalitaRad && repartoFiltro === "tutti"} />}
        {tab === "crea" && <TabCrea membriTutti={membri} modalitaRad={!!modalitaRad} repartoIniziale={repartoFiltro !== "tutti" ? repartoFiltro : ""} />}
        {tab === "vista" && <TabVista membri={membriFiltrati} tasks={tasksFiltrati} profile={profile} />}
        {tab === "panoramica" && <PanoramicaPersone persone={capiReparto ?? []} />}
      </div>
    </div>
  );
}

// ============================================================
// TAB 1 — Task divise per persone
// ============================================================
function TabPersone({
  membri, tasks, profile, raggruppaPerReparto,
}: {
  membri: Membro[]; tasks: Task[]; profile: { id: string }; raggruppaPerReparto?: boolean;
}) {
  const taskSenzaAssegnazione = tasks.filter((t) => !t.assegnato_a);

  if (raggruppaPerReparto) {
    return (
      <div>
        {REPARTI.map((r) => {
          const membriReparto = membri.filter((m) => m.reparto === r.value);
          const taskReparto = tasks.filter((t) => t.reparto === r.value);
          if (membriReparto.length === 0 && taskReparto.filter((t) => !t.assegnato_a).length === 0) return null;
          return (
            <div key={r.value} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>
                {r.label}
              </div>
              {taskReparto.filter((t) => !t.assegnato_a).length > 0 && (
                <PersonaCard nome="Tutto il reparto" badge={null} tasks={taskReparto.filter((t) => !t.assegnato_a)} puoEliminare />
              )}
              {membriReparto.map((m) => (
                <PersonaCard
                  key={m.id}
                  nome={m.full_name || m.email}
                  badge={m.ruolo === "capo" ? "Capo reparto" : null}
                  tasks={tasks.filter((t) => t.assegnato_a === m.id)}
                  puoEliminare
                />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {taskSenzaAssegnazione.length > 0 && (
        <PersonaCard nome="Tutto il reparto" badge={null} tasks={taskSenzaAssegnazione} puoEliminare />
      )}

      {membri.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro ancora.</p>
      )}

      {membri.map((m) => {
        const taskPersona = tasks.filter((t) => t.assegnato_a === m.id);
        return (
          <PersonaCard
            key={m.id}
            nome={m.full_name || m.email}
            badge={m.ruolo === "capo" ? "Capo reparto" : null}
            tasks={taskPersona}
            puoEliminare
          />
        );
      })}
    </div>
  );
}

function PersonaCard({ nome, badge, tasks, puoEliminare }: { nome: string; badge: string | null; tasks: Task[]; puoEliminare: boolean }) {
  const [aperta, setAperta] = useState(false);
  const stato = statoPersona(tasks);

  return (
    <div className="card" style={{ padding: 0, marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => setAperta(!aperta)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
      >
        <span className={stato === "critico" ? "pulse-dot" : ""} style={{ width: 10, height: 10, borderRadius: "50%", background: STATO_COLORE[stato], flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{nome}</span>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", background: "#E5F4EA", borderRadius: 999, padding: "1px 7px" }}>{badge}</span>
        )}
        <span style={{ fontSize: 11, color: "var(--gray-text)", marginLeft: "auto" }}>
          {tasks.filter((t) => t.completato).length}/{tasks.length} completati
        </span>
        <span style={{ fontSize: 10.5, color: "var(--gray-text)", transform: aperta ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>▾</span>
      </button>

      {aperta && (
        <div style={{ padding: "0 16px 14px" }}>
          {tasks.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--gray-text)", margin: 0 }}>Nessun task assegnato.</p>
          ) : (
            <TaskAccordionList tasks={tasks} puoEliminare={puoEliminare} />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 2 — Creazione e assegnazione task
// ============================================================
function TabCrea({ membriTutti, modalitaRad, repartoIniziale }: { membriTutti: Membro[]; modalitaRad: boolean; repartoIniziale: string }) {
  const [isPending, startTransition] = useTransition();
  const [destinazione, setDestinazione] = useState<"reparto" | "persona">("persona");
  const [repartoScelto, setRepartoScelto] = useState(repartoIniziale);
  const [toast, setToast] = useState<string | null>(null);

  const membriDelReparto = modalitaRad ? membriTutti.filter((m) => m.reparto === repartoScelto) : membriTutti;

  function salva(formData: FormData) {
    if (destinazione === "reparto") formData.set("assegnato_a", "");
    if (modalitaRad) formData.set("reparto", repartoScelto);
    startTransition(async () => {
      await createTask(formData);
      setToast("Task assegnata");
      setTimeout(() => setToast(null), 2200);
      (document.getElementById("form-nuova-task") as HTMLFormElement)?.reset();
    });
  }

  const pronto = !modalitaRad || !!repartoScelto;

  return (
    <div style={{ maxWidth: 480 }}>
      {modalitaRad && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Reparto</label>
          <select value={repartoScelto} onChange={(e) => setRepartoScelto(e.target.value)} style={inputStyle}>
            <option value="" disabled>Scegli il reparto...</option>
            {REPARTI.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      )}

      {pronto && (
        <form id="form-nuova-task" action={salva} className="card" style={{ display: "grid", gap: 14, padding: 22 }}>
          <div>
            <label style={labelStyle}>A chi va assegnata?</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button" onClick={() => setDestinazione("persona")}
                style={{ flex: 1, padding: "9px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${destinazione === "persona" ? "var(--blue)" : "var(--border)"}`, background: destinazione === "persona" ? "#E5F4EA" : "var(--white)", color: destinazione === "persona" ? "var(--blue)" : "var(--dark)" }}
              >
                Persona specifica
              </button>
              <button
                type="button" onClick={() => setDestinazione("reparto")}
                style={{ flex: 1, padding: "9px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${destinazione === "reparto" ? "var(--blue)" : "var(--border)"}`, background: destinazione === "reparto" ? "#E5F4EA" : "var(--white)", color: destinazione === "reparto" ? "var(--blue)" : "var(--dark)" }}
              >
                Tutto il reparto
              </button>
            </div>
          </div>

          {destinazione === "persona" && (
            <div>
              <label style={labelStyle}>Persona</label>
              <select name="assegnato_a" required style={inputStyle} defaultValue="">
                <option value="" disabled>Scegli chi...</option>
                {membriDelReparto.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Titolo</label>
            <input name="titolo" type="text" required placeholder="Es. Scaletta puntata di giovedì" style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Data inizio</label>
              <input name="data_inizio" type="date" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Data fine</label>
              <input name="puntata_data" type="date" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descrizione</label>
            <textarea name="descrizione" placeholder="Dettagli utili (facoltativo)" style={{ ...inputStyle, minHeight: 70 }} />
          </div>

          <button type="submit" disabled={isPending} className="btn-primary">{isPending ? "Salvataggio…" : "Assegna task"}</button>
        </form>
      )}

      <div
        className="toast-elastic"
        style={{
          position: "fixed", bottom: 26, right: 26, background: "var(--dark)", color: "#fff", padding: "13px 18px",
          borderRadius: 13, fontSize: 13.5, display: "flex", alignItems: "center", gap: 10,
          transform: toast ? "translateY(0)" : "translateY(140%)", zIndex: 50,
          boxShadow: "0 14px 30px -10px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}

// ============================================================
// TAB 3 — Vista generale (classifica avanzamento + filtri urgenza)
// ============================================================
function TabVista({ membri, tasks, profile }: { membri: Membro[]; tasks: Task[]; profile: { id: string } }) {
  const [filtro, setFiltro] = useState<Urgenza | null>(null);

  const conteggi = { ritardo: 0, urgente: 0, tranquillo: 0 };
  tasks.forEach((t) => {
    const u = classificaUrgenza(t);
    if (u) conteggi[u]++;
  });

  const tasksFiltrati = filtro ? tasks.filter((t) => classificaUrgenza(t) === filtro) : tasks;

  const classifica = membri
    .map((m) => {
      const taskPersona = tasks.filter((t) => t.assegnato_a === m.id);
      const completate = taskPersona.filter((t) => t.completato).length;
      const percentuale = taskPersona.length ? Math.round((completate / taskPersona.length) * 100) : null;
      return { membro: m, percentuale, totale: taskPersona.length };
    })
    .sort((a, b) => (b.percentuale ?? -1) - (a.percentuale ?? -1));

  return (
    <div>
      <div className="grid-stack-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
        <FiltroBtn label="Tutti" valore={tasks.length} attivo={!filtro} colore="var(--dark)" onClick={() => setFiltro(null)} />
        <FiltroBtn label="In ritardo" valore={conteggi.ritardo} attivo={filtro === "ritardo"} colore="#DC2626" onClick={() => setFiltro("ritardo")} />
        <FiltroBtn label="Urgente" valore={conteggi.urgente} attivo={filtro === "urgente"} colore="#D97706" onClick={() => setFiltro("urgente")} />
        <FiltroBtn label="Tranquillo" valore={conteggi.tranquillo} attivo={filtro === "tranquillo"} colore="var(--blue)" onClick={() => setFiltro("tranquillo")} />
      </div>

      <div className="section-label" style={{ marginTop: 0 }}>Classifica avanzamento</div>
      {classifica.length === 0 && <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro in questa vista.</p>}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {classifica.map(({ membro, percentuale, totale }, i) => (
          <div key={membro.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 18, fontSize: 11.5, fontWeight: 700, color: "var(--gray-text)", textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 130, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {membro.full_name || membro.email}
            </span>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--light-bg)", overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", width: `${percentuale ?? 0}%`, background: percentuale === 100 ? "#16A34A" : "linear-gradient(90deg, var(--blue-dark), var(--blue-light))", borderRadius: 999, transition: "width 0.3s ease", position: "relative", overflow: "hidden" }}>
                {percentuale === 100 && <div className="shimmer-overlay" />}
              </div>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 34, textAlign: "right", flexShrink: 0, color: "var(--gray-text)" }}>
              {totale ? `${percentuale}%` : "—"}
            </span>
          </div>
        ))}
      </div>

      <div className="section-label">Task {filtro ? `(${filtro})` : ""}</div>
      <TaskAccordionList tasks={tasksFiltrati} emptyText="Nessun task in questa categoria." />
    </div>
  );
}

function FiltroBtn({ label, valore, attivo, colore, onClick }: { label: string; valore: number; attivo: boolean; colore: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        display: "block", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
        border: attivo ? `1.5px solid ${colore}` : undefined,
        background: attivo ? `${colore}14` : undefined,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Fraunces', Georgia, serif", color: colore }}>{valore}</div>
      <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2 }}>{label}</div>
    </button>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
