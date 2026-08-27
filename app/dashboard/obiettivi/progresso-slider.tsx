"use client";

import { useState, useTransition } from "react";
import { updateObiettivoManuale } from "@/lib/actions";

export default function ProgressoManualeSlider({ obiettivoId, valoreIniziale }: { obiettivoId: string; valoreIniziale: number }) {
  const [valore, setValore] = useState(valoreIniziale);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nuovo = Number(e.target.value);
    setValore(nuovo);
  }

  function handleCommit() {
    startTransition(async () => {
      await updateObiettivoManuale(obiettivoId, valore);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
      <input
        type="range"
        min={0}
        max={100}
        value={valore}
        onChange={handleChange}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        style={{ flex: 1, accentColor: "var(--blue)" }}
      />
      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 34, textAlign: "right", opacity: isPending ? 0.5 : 1 }}>
        {valore}%
      </span>
    </div>
  );
}
