"use client";

import { useState, useTransition } from "react";
import { impostaStatoTask, deleteTask } from "@/lib/actions";

const STATI = [
  { value: "da_fare", label: "Da fare", color: "#B0B0B5" },
  { value: "in_corso", label: "In corso", color: "#D97706" },
  { value: "completata", label: "Completata", color: "#2C7A45" },
] as const;

type Task = {
  id: string;
  titolo: string;
  stato?: string;
  completato: boolean;
  puntata_data: string | null;
  descrizione: string | null;
  assegnato_a?: string | null;
};

export default function TaskAccordionList({
  tasks,
  puoEliminare,
  emptyText = "Nessuna task.",
}: {
  tasks: Task[];
  puoEliminare?: boolean;
  emptyText?: string;
}) {
  const [aperto, setAperto] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function mostraToast(testo: string) {
    setToast(testo);
    setTimeout(() => setToast(null), 2200);
  }

  function cambiaStato(id: string, nuovo: string) {
    startTransition(async () => {
      await impostaStatoTask(id, nuovo as "da_fare" | "in_corso" | "completata");
      mostraToast(`Stato aggiornato: ${STATI.find((s) => s.value === nuovo)?.label}`);
    });
  }

  function elimina(id: string) {
    startTransition(async () => {
      await deleteTask(id);
      mostraToast("Task eliminata");
      setAperto(null);
    });
  }

  if (tasks.length === 0) {
    return <p className="placeholder-note" style={{ marginTop: 0 }}>{emptyText}</p>;
  }

  return (
    <div>
      {tasks.map((t) => {
        const stato = t.stato ?? (t.completato ? "completata" : "da_fare");
        const statoInfo = STATI.find((s) => s.value === stato) ?? STATI[0];
        const isOpen = aperto === t.id;

        return (
          <div key={t.id} style={{ background: "var(--light-bg)", borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
            <button
              onClick={() => setAperto(isOpen ? null : t.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
            >
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: statoInfo.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: stato === "completata" ? "line-through" : "none", color: stato === "completata" ? "#a1a1a6" : "var(--dark)" }}>
                  {t.titolo}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--gray-text)" }}>
                  {t.puntata_data ? `Scadenza ${new Date(t.puntata_data).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}` : "Nessuna scadenza"}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--gray-text)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", flexShrink: 0 }}>▾</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 14px 14px" }}>
                {t.descrizione && (
                  <p style={{ fontSize: 12.5, color: "var(--dark)", background: "var(--white)", borderRadius: 10, padding: 12, margin: "0 0 12px", lineHeight: 1.5 }}>
                    {t.descrizione}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--white)", borderRadius: 10, padding: "10px 12px", marginBottom: puoEliminare ? 8 : 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Stato</span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {STATI.map((s) => {
                      const attivo = stato === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          disabled={isPending}
                          onClick={() => cambiaStato(t.id, s.value)}
                          style={{
                            fontSize: 10.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999,
                            border: `1px solid ${attivo ? s.color : "var(--border)"}`,
                            background: attivo ? s.color : "transparent",
                            color: attivo ? "#fff" : "var(--gray-text)",
                            cursor: "pointer", opacity: isPending ? 0.6 : 1,
                          }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {puoEliminare && (
                  <button onClick={() => elimina(t.id)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                    Elimina task
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

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
