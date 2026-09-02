"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assegnaTaskRad } from "@/lib/actions";
import { repartoColor, repartoLabel } from "@/lib/reparti";

const REPARTI = [
  { value: "speaker", label: "Speaker" },
  { value: "social", label: "Social media" },
  { value: "tecnico_video", label: "Tecnico video" },
  { value: "tecnico_audio", label: "Tecnico audio" },
  { value: "qualita", label: "Qualità" },
];

type Membro = { id: string; full_name: string | null; email: string; reparto: string | null };
type Invio = { id: string; titolo: string; destinatario: string };

export default function AssegnazioneRadForm({ membri }: { membri: Membro[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [recenti, setRecenti] = useState<Invio[]>([]);

  const [titolo, setTitolo] = useState("");
  const [reparto, setReparto] = useState("speaker");
  const [specifico, setSpecifico] = useState(false);
  const [membroScelto, setMembroScelto] = useState<Membro | null>(null);
  const [descrizione, setDescrizione] = useState("");

  const membriReparto = membri.filter((m) => m.reparto === reparto);

  function mostraToast(testo: string) {
    setToast(testo);
    setTimeout(() => setToast(null), 2600);
  }

  function invia() {
    if (!titolo.trim()) return;
    const fd = new FormData();
    fd.set("titolo", titolo);
    fd.set("reparto", reparto);
    fd.set("assegnato_a", specifico && membroScelto ? membroScelto.id : "");
    fd.set("descrizione", descrizione);
    startTransition(async () => {
      await assegnaTaskRad(fd);
      const destinatario = specifico && membroScelto
        ? (membroScelto.full_name || membroScelto.email)
        : `Tutto il reparto ${repartoLabel(reparto)}`;
      mostraToast(
        specifico && membroScelto
          ? `Task inviata a ${destinatario.split(" ")[0]}`
          : `Task inviata a tutto il reparto ${repartoLabel(reparto)}`
      );
      setRecenti((r) => [{ id: `${Date.now()}`, titolo, destinatario }, ...r].slice(0, 6));
      setTitolo("");
      setDescrizione("");
      setSpecifico(false);
      setMembroScelto(null);
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 520, marginBottom: 28 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-text)", textTransform: "uppercase", marginBottom: 14 }}>
          Assegna una task
        </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Nome task</label>
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} type="text" placeholder="Es. Preparare scaletta puntata" style={inputStyle} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Reparto</label>
        <select
          value={reparto}
          onChange={(e) => { setReparto(e.target.value); setMembroScelto(null); }}
          style={inputStyle}
        >
          {REPARTI.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--light-bg)", borderRadius: 10, padding: "10px 12px", marginBottom: specifico ? 10 : 14 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Assegna a un membro specifico</span>
        <button
          type="button"
          onClick={() => { setSpecifico(!specifico); setMembroScelto(null); }}
          style={{
            width: 38, height: 22, borderRadius: 20, border: "none", cursor: "pointer", position: "relative",
            background: specifico ? "var(--blue)" : "#d7dae3", transition: "background 0.2s ease",
          }}
        >
          <span style={{ position: "absolute", top: 2, left: specifico ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
        </button>
      </div>

      {specifico && (
        <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 14 }}>
          {membriReparto.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--gray-text)", padding: 12, margin: 0 }}>Nessun membro in questo reparto.</p>
          )}
          {membriReparto.map((m) => {
            const scelto = membroScelto?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setMembroScelto(scelto ? null : m)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", cursor: "pointer", fontSize: 13,
                  background: scelto ? "#E5F4EA" : "transparent", color: scelto ? "var(--blue)" : "var(--dark)", fontWeight: scelto ? 600 : 400,
                }}
              >
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: repartoColor(m.reparto), color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {(m.full_name || m.email).split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                {m.full_name || m.email}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Descrizione</label>
        <textarea value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Dettagli, riferimenti..." style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} />
      </div>

        <button onClick={invia} disabled={isPending} className="btn-primary" style={{ width: "100%" }}>
          Invia task
        </button>
      </div>

      {recenti.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-label" style={{ marginTop: 0, marginBottom: 10 }}>Inviate di recente</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recenti.map((r) => (
              <div
                key={r.id}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", animation: "fadeInUp 0.3s ease both" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.titolo}</div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-text)" }}>Assegnata a: {r.destinatario}</div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#DCFCE7", color: "#166534", flexShrink: 0 }}>
                  Inviata
                </span>
              </div>
            ))}
          </div>
          <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}

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

const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--dark)", marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--border)", background: "#fbfbfd", borderRadius: 10,
  padding: "9px 11px", fontSize: 13, fontFamily: "inherit", color: "var(--dark)",
};
