"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { azzeraTask, azzeraValutazioni, azzeraResoconti } from "@/lib/actions";

type Azione = "task" | "valutazioni" | "resoconti";

const TESTI: Record<Azione, { titolo: string; descrizione: string; bottone: string; esito: string }> = {
  task: {
    titolo: "Azzera task",
    descrizione: "Elimina tutte le task di tutti i reparti e le notifiche collegate.",
    bottone: "Azzera task",
    esito: "task eliminate",
  },
  valutazioni: {
    titolo: "Azzera valutazioni",
    descrizione: "Elimina tutti i voti ai membri (attitudine, professionalità, performance). Il voto medio e il voto finale ripartono da zero.",
    bottone: "Azzera valutazioni",
    esito: "valutazioni eliminate",
  },
  resoconti: {
    titolo: "Azzera resoconti Qualità",
    descrizione: "Elimina tutti i resoconti di puntata con le loro checklist (sia in Resoconto Qualità sia nella lista di approvazione del RAD). Le task create da quei resoconti restano: si cancellano con \"Azzera task\".",
    bottone: "Azzera resoconti",
    esito: "resoconti eliminati",
  },
};

export default function ResetDati() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aperta, setAperta] = useState<Azione | null>(null);
  const [testo, setTesto] = useState("");
  const [esito, setEsito] = useState<{ ok: boolean; msg: string } | null>(null);

  function conferma() {
    if (!aperta || testo.trim().toUpperCase() !== "AZZERA") return;
    const azione = aperta;
    startTransition(async () => {
      const res =
        azione === "task" ? await azzeraTask()
        : azione === "valutazioni" ? await azzeraValutazioni()
        : await azzeraResoconti();
      if (res.success) {
        setEsito({ ok: true, msg: `${res.eliminate ?? 0} ${TESTI[azione].esito}.` });
      } else {
        setEsito({ ok: false, msg: res.errore ?? "Errore durante l'operazione." });
      }
      setAperta(null);
      setTesto("");
      router.refresh();
    });
  }

  return (
    <div className="card card-static" style={{ marginTop: 36, borderColor: "#FCA5A5" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>Azzera dati</div>
      <p style={{ fontSize: 12.5, color: "var(--gray-text)", margin: "0 0 16px" }}>
        Operazioni definitive, non si possono annullare. Visibili solo al RAD.
      </p>

      {(["task", "valutazioni", "resoconti"] as const).map((a) => (
        <div key={a} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{TESTI[a].titolo}</div>
              <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2 }}>{TESTI[a].descrizione}</div>
            </div>
            {aperta !== a && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => { setAperta(a); setTesto(""); setEsito(null); }}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #FCA5A5", background: "#fff", color: "#B91C1C", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                {TESTI[a].bottone}
              </button>
            )}
          </div>

          {aperta === a && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={testo}
                onChange={(e) => setTesto(e.target.value)}
                placeholder="Scrivi AZZERA per confermare"
                style={{ padding: "8px 11px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, fontFamily: "inherit", minWidth: 220 }}
              />
              <button
                type="button"
                onClick={conferma}
                disabled={isPending || testo.trim().toUpperCase() !== "AZZERA"}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "none", fontSize: 12.5, fontWeight: 600, color: "#fff",
                  background: testo.trim().toUpperCase() === "AZZERA" ? "#B91C1C" : "#D1D5DB",
                  cursor: testo.trim().toUpperCase() === "AZZERA" ? "pointer" : "not-allowed",
                }}
              >
                {isPending ? "Elimino…" : "Conferma"}
              </button>
              <button
                type="button"
                onClick={() => { setAperta(null); setTesto(""); }}
                style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "none", color: "var(--gray-text)", fontSize: 12.5, cursor: "pointer" }}
              >
                Annulla
              </button>
            </div>
          )}
        </div>
      ))}

      {esito && (
        <p style={{ fontSize: 12.5, margin: "12px 0 0", color: esito.ok ? "#166534" : "#B91C1C" }}>{esito.msg}</p>
      )}
    </div>
  );
}
