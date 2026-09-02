"use client";

import { useTransition } from "react";
import { impostaStatoTask } from "@/lib/actions";

const STATI = [
  { value: "da_fare", label: "Da fare", color: "#6E6E73" },
  { value: "in_corso", label: "In corso", color: "#D97706" },
  { value: "completata", label: "Completata", color: "#2C7A45" },
] as const;

export default function TaskStatusPills({ taskId, stato }: { taskId: string; stato: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      {STATI.map((s) => {
        const attivo = stato === s.value;
        return (
          <button
            key={s.value}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => impostaStatoTask(taskId, s.value))}
            style={{
              fontSize: 10.5, fontWeight: 600, padding: "4px 9px", borderRadius: 999,
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
  );
}
