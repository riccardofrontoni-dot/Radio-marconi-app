"use client";

import { useState, useTransition } from "react";
import { updateMemberReparto } from "@/lib/actions";
import { REPARTI, repartoColor } from "@/lib/reparti";

export default function RepartoSelect({ profileId, repartoAttuale }: { profileId: string; repartoAttuale: string | null }) {
  const [valore, setValore] = useState(repartoAttuale ?? "");
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuovo = e.target.value;
    setValore(nuovo);
    startTransition(async () => {
      await updateMemberReparto(profileId, nuovo);
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: valore ? repartoColor(valore) : "#D2D2D7", flexShrink: 0 }} />
      <select
        value={valore}
        onChange={handleChange}
        style={{
          fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)",
          background: "var(--white)", fontFamily: "inherit", color: "var(--dark)", minWidth: 150,
          opacity: isPending ? 0.6 : 1,
        }}
      >
        <option value="">Nessun reparto</option>
        {REPARTI.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </div>
  );
}
