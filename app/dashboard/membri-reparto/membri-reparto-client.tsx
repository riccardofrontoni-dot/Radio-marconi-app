"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, inviaAvviso, toggleTask, deleteTask } from "@/lib/actions";
import { repartoColor, repartoLabel } from "@/lib/reparti";
import TaskAccordionList from "../task/task-accordion";

type Membro = { id: string; full_name: string | null; email: string; reparto: string | null };
type Task = { id: string; titolo: string; completato: boolean; stato: string; assegnato_a: string | null; puntata_data: string | null; descrizione: string | null };

function iniziali(nome: string) {
  return nome.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export default function MembriRepartoClient({
  membri,
  tasksIniziali,
  reparto,
}: {
  membri: Membro[];
  tasksIniziali: Task[];
  reparto: string | null;
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [nomeTask, setNomeTask] = useState("");
  const [scadenza, setScadenza] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [testoAvviso, setTestoAvviso] = useState("");

  const colore = repartoColor(reparto);
  const membro = aperto ? membri.find((m) => m.id === aperto) : null;
  const taskMembro = aperto ? tasksIniziali.filter((t) => t.assegnato_a === aperto) : [];

  function mostraToast(testo: string) {
    setToast(testo);
    setTimeout(() => setToast(null), 2600);
  }

  function apriPannello(id: string) {
    setAperto(id);
    setNomeTask("");
    setScadenza("");
    setDescrizione("");
    setTestoAvviso("");
  }

  function assegnaTask() {
    if (!nomeTask.trim() || !aperto) return;
    const fd = new FormData();
    fd.set("titolo", nomeTask);
    fd.set("assegnato_a", aperto);
    fd.set("puntata_data", scadenza);
    fd.set("descrizione", descrizione);
    startTransition(async () => {
      await createTask(fd);
      mostraToast(`Task assegnata a ${membro?.full_name?.split(" ")[0] || "membro"}`);
      setNomeTask("");
      setScadenza("");
      setDescrizione("");
      router.refresh();
    });
  }

  function invia() {
    if (!testoAvviso.trim() || !aperto) return;
    const fd = new FormData();
    fd.set("testo", testoAvviso);
    startTransition(async () => {
      await inviaAvviso(aperto, fd);
      mostraToast(`Avviso inviato a ${membro?.full_name?.split(" ")[0] || "membro"}`);
      setTestoAvviso("");
      router.refresh();
    });
  }

  function spunta(taskId: string, completato: boolean) {
    startTransition(async () => {
      await toggleTask(taskId, completato);
      router.refresh();
    });
  }

  function elimina(taskId: string) {
    startTransition(async () => {
      await deleteTask(taskId);
      router.refresh();
    });
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Membri del reparto</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Clicca un membro per assegnargli una task o mandargli un avviso.
      </p>

      {membri.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro nel reparto ancora.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14, maxWidth: 860 }}>
        {membri.map((m) => {
          const taskPersona = tasksIniziali.filter((t) => t.assegnato_a === m.id);
          const completati = taskPersona.filter((t) => t.completato).length;
          return (
            <button
              key={m.id}
              onClick={() => apriPannello(m.id)}
              className="card"
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                fontFamily: "inherit", cursor: "pointer", padding: 16,
              }}
            >
              <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: colore, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                {iniziali(m.full_name || m.email)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.full_name || m.email}</div>
                <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 2 }}>
                  {taskPersona.length > 0 ? `${completati}/${taskPersona.length} task completate` : "Nessuna task"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Overlay + pannello */}
      <div
        onClick={() => setAperto(null)}
        style={{
          position: "fixed", inset: 0, background: "rgba(20,24,40,0.28)",
          opacity: aperto ? 1 : 0, pointerEvents: aperto ? "auto" : "none",
          transition: "opacity 0.22s ease", zIndex: 40,
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", top: 0, right: 0, height: "100%", width: 420, maxWidth: "92vw",
          background: "var(--white)", boxShadow: "-18px 0 40px rgba(20,24,40,0.16)",
          transform: aperto ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(.22,.9,.32,1)", zIndex: 41,
          padding: "26px 26px 24px", display: "flex", flexDirection: "column", overflowY: "auto",
        }}
      >
        {membro && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: colore, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {iniziali(membro.full_name || membro.email)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{membro.full_name || membro.email}</div>
                <div style={{ fontSize: 12.5, color: "var(--gray-text)" }}>{repartoLabel(membro.reparto)}</div>
              </div>
              <button onClick={() => setAperto(null)} style={{ border: "none", background: "var(--light-bg)", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", color: "var(--gray-text)", fontSize: 14 }}>✕</button>
            </div>

            {taskMembro.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Task assegnate</label>
                <TaskAccordionList tasks={taskMembro} puoEliminare />
              </div>
            )}

            <div className="field" style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nome task</label>
              <input value={nomeTask} onChange={(e) => setNomeTask(e.target.value)} type="text" placeholder="Es. Editing video puntata" style={inputStyle} />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Scadenza</label>
              <input value={scadenza} onChange={(e) => setScadenza(e.target.value)} type="date" style={inputStyle} />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Descrizione</label>
              <textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Dettagli, riferimenti..." style={{ ...inputStyle, minHeight: 74, resize: "vertical" }} />
            </div>
            <button onClick={assegnaTask} disabled={isPending} className="btn-primary" style={{ marginBottom: 24 }}>
              Assegna task
            </button>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: "auto" }}>
              <label style={labelStyle}>Manda un avviso</label>
              <textarea value={testoAvviso} onChange={(e) => setTestoAvviso(e.target.value)} placeholder="Un messaggio rapido..." style={{ ...inputStyle, minHeight: 60, resize: "vertical", marginBottom: 10 }} />
              <button onClick={invia} disabled={isPending} className="btn-primary" style={{ width: "100%", background: colore }}>
                Invia avviso
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
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

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--dark)", marginBottom: 6 };
const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--border)", background: "#fbfbfd", borderRadius: 10,
  padding: "9px 11px", fontSize: 13, fontFamily: "inherit", color: "var(--dark)",
};
