"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/lib/actions";
import TaskAccordionList from "./task-accordion";

type Task = {
  id: string;
  titolo: string;
  descrizione: string | null;
  completato: boolean;
  stato: string;
  assegnato_a: string | null;
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
const STATO_LABEL = { critico: "Critico", attenzione: "Attenzione", buono: "Buono" };

export default function GestioneTaskCapoClient({
  profile, membri, tasks,
}: {
  profile: { id: string; reparto: string };
  membri: Membro[];
  tasks: Task[];
}) {
  const [tab, setTab] = useState<"persone" | "crea" | "vista">("persone");

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Gestione task</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 20 }}>
        Assegna task ai membri del tuo reparto e tieni traccia dell'avanzamento.
      </p>

      <div style={{ display: "flex", gap: 4, background: "var(--light-bg)", borderRadius: 10, padding: 4, marginBottom: 26, maxWidth: 560 }}>
        {(["persone", "crea", "vista"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "9px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              background: tab === t ? "var(--white)" : "transparent",
              color: tab === t ? "var(--dark)" : "var(--gray-text)",
            }}
          >
            {t === "persone" ? "Task per persona" : t === "crea" ? "Crea e assegna" : "Vista generale"}
          </button>
        ))}
      </div>

      {tab === "persone" && <TabPersone membri={membri} tasks={tasks} profile={profile} />}
      {tab === "crea" && <TabCrea membri={membri} />}
      {tab === "vista" && <TabVista membri={membri} tasks={tasks} profile={profile} />}
    </div>
  );
}

// ============================================================
// TAB 1 — Task divise per persone
// ============================================================
function TabPersone({ membri, tasks, profile }: { membri: Membro[]; tasks: Task[]; profile: { id: string } }) {
  const taskSenzaAssegnazione = tasks.filter((t) => !t.assegnato_a);

  return (
    <div>
      {taskSenzaAssegnazione.length > 0 && (
        <PersonaCard
          nome="Tutto il reparto"
          badge={null}
          tasks={taskSenzaAssegnazione}
          puoEliminare
        />
      )}

      {membri.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro nel reparto ancora.</p>
      )}

      {membri.map((m) => {
        const taskPersona = tasks.filter((t) => t.assegnato_a === m.id);
        return (
          <PersonaCard
            key={m.id}
            nome={m.full_name || m.email}
            badge={m.ruolo === "capo" ? "Capo reparto" : null}
            tasks={taskPersona}
            puoEliminare={m.id === profile.id}
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
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => setAperta(!aperta)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
      >
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: STATO_COLORE[stato], flexShrink: 0 }} />
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
function TabCrea({ membri }: { membri: Membro[] }) {
  const [isPending, startTransition] = useTransition();
  const [destinazione, setDestinazione] = useState<"reparto" | "persona">("persona");
  const [toast, setToast] = useState<string | null>(null);

  function salva(formData: FormData) {
    if (destinazione === "reparto") formData.set("assegnato_a", "");
    startTransition(async () => {
      await createTask(formData);
      setToast("Task assegnata");
      setTimeout(() => setToast(null), 2200);
      (document.getElementById("form-nuova-task") as HTMLFormElement)?.reset();
    });
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <form id="form-nuova-task" action={salva} style={{ display: "grid", gap: 14 }}>
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
              {membri.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {classifica.map(({ membro, percentuale, totale }, i) => (
          <div key={membro.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 18, fontSize: 11.5, fontWeight: 700, color: "var(--gray-text)", textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 130, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {membro.full_name || membro.email}
            </span>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--light-bg)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${percentuale ?? 0}%`, background: percentuale === 100 ? "#16A34A" : "var(--blue)", borderRadius: 999, transition: "width 0.3s ease" }} />
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
        border: attivo ? `1.5px solid ${colore}` : "1px solid var(--border)",
        background: attivo ? `${colore}0F` : "var(--white)",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", color: colore }}>{valore}</div>
      <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2 }}>{label}</div>
    </button>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
