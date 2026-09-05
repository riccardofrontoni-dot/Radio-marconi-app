"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, inviaAvviso, toggleTask, deleteTask, creaFormat, eliminaFormat } from "@/lib/actions";
import { repartoColor, repartoLabel } from "@/lib/reparti";
import TaskAccordionList from "../task/task-accordion";

type Membro = { id: string; full_name: string | null; email: string; reparto: string | null };
type Task = { id: string; titolo: string; completato: boolean; stato: string; assegnato_a: string | null; puntata_data: string | null; descrizione: string | null };
type Format = { id: string; nome: string; membri: string[] };

function iniziali(nome: string) {
  return nome.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export default function MembriRepartoClient({
  membri,
  tasksIniziali,
  reparto,
  formatsIniziali,
}: {
  membri: Membro[];
  tasksIniziali: Task[];
  reparto: string | null;
  formatsIniziali: Format[];
}) {
  const router = useRouter();
  const [aperto, setAperto] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mostraFormatForm, setMostraFormatForm] = useState(false);
  const [nomeFormat, setNomeFormat] = useState("");
  const [membriFormat, setMembriFormat] = useState<string[]>([]);

  function toggleMembroFormat(id: string) {
    setMembriFormat((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function salvaFormat() {
    if (!nomeFormat.trim()) return;
    const fd = new FormData();
    fd.set("nome", nomeFormat);
    fd.set("reparto", reparto ?? "");
    membriFormat.forEach((id) => fd.append("membri", id));
    startTransition(async () => {
      await creaFormat(fd);
      mostraToast(`Format "${nomeFormat}" creato`);
      setNomeFormat("");
      setMembriFormat([]);
      setMostraFormatForm(false);
      router.refresh();
    });
  }
  function rimuoviFormat(id: string, nome: string) {
    startTransition(async () => {
      await eliminaFormat(id);
      mostraToast(`Format "${nome}" eliminato`);
      router.refresh();
    });
  }

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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Format</div>
        <button onClick={() => setMostraFormatForm(!mostraFormatForm)} className="btn-primary" style={{ fontSize: 11.5, padding: "6px 12px" }}>
          {mostraFormatForm ? "Annulla" : "+ Nuovo format"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--gray-text)", marginTop: -6, marginBottom: 14 }}>
        Un format ricorrente (es. "Future") con le persone che ne fanno parte — quando crei una diretta sul calendario, potrai scegliere il format per precompilare titolo e persone coinvolte.
      </p>

      {mostraFormatForm && (
        <div className="card" style={{ padding: 16, marginBottom: 16, maxWidth: 480 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Nome del format</label>
            <input
              value={nomeFormat}
              onChange={(e) => setNomeFormat(e.target.value)}
              type="text"
              placeholder="Es. Future"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, fontFamily: "inherit" }}
            />
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>Persone del format</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {membri.map((m) => (
              <label
                key={m.id}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 999, padding: "5px 10px", cursor: "pointer" }}
              >
                <input type="checkbox" checked={membriFormat.includes(m.id)} onChange={() => toggleMembroFormat(m.id)} />
                {m.full_name || m.email}
              </label>
            ))}
          </div>
          <button onClick={salvaFormat} disabled={isPending} className="btn-primary" style={{ width: "100%" }}>
            Crea format
          </button>
        </div>
      )}

      {formatsIniziali.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
          {formatsIniziali.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{f.nome}</span>
              <span style={{ fontSize: 11.5, color: "var(--gray-text)" }}>
                {f.membri.map((id) => membri.find((m) => m.id === id)?.full_name?.split(" ")[0]).filter(Boolean).join(", ") || "nessuno"}
              </span>
              <button onClick={() => rimuoviFormat(f.id, f.nome)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                Elimina
              </button>
            </div>
          ))}
        </div>
      )}

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
