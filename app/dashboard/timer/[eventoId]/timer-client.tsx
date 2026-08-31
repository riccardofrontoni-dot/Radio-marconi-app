"use client";

import { useEffect, useState, useTransition } from "react";
import { salvaTimerSessione } from "@/lib/actions";

type Blocco = { nome: string; durata_minuti: number };
type Risultato = { nome: string; pianificato_sec: number; effettivo_sec: number };
type Sessione = { dettaglio: Risultato[]; precisione: number } | null;

function formatta(sec: number) {
  const m = Math.floor(Math.abs(sec) / 60);
  const s = Math.abs(sec) % 60;
  const segno = sec < 0 ? "-" : "";
  return `${segno}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimerClient({
  eventoId,
  blocchi,
  sessioneEsistente,
}: {
  eventoId: string;
  blocchi: Blocco[];
  sessioneEsistente: Sessione;
}) {
  const [fase, setFase] = useState<"pronto" | "in_corso" | "finito">(sessioneEsistente ? "finito" : "pronto");
  const [indice, setIndice] = useState(0);
  const [inizioTs, setInizioTs] = useState<number | null>(null);
  const [ora, setOra] = useState(Date.now());
  const [risultati, setRisultati] = useState<Risultato[]>(sessioneEsistente?.dettaglio ?? []);
  const [precisioneFinale, setPrecisioneFinale] = useState<number>(sessioneEsistente?.precisione ?? 0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (fase !== "in_corso") return;
    const t = setInterval(() => setOra(Date.now()), 1000);
    return () => clearInterval(t);
  }, [fase]);

  if (blocchi.length === 0) {
    return <p className="placeholder-note" style={{ marginTop: 0 }}>Lo script non ha ancora blocchi con una durata — aggiungine almeno uno.</p>;
  }

  const bloccoAttuale = blocchi[indice];
  const pianificatoSec = (bloccoAttuale?.durata_minuti ?? 0) * 60;
  const trascorsoSec = inizioTs ? Math.floor((ora - inizioTs) / 1000) : 0;
  const differenza = trascorsoSec - pianificatoSec;

  function avvia() {
    setRisultati([]);
    setIndice(0);
    setInizioTs(Date.now());
    setFase("in_corso");
  }

  function prossimo() {
    const effettivo = Math.floor((Date.now() - (inizioTs ?? Date.now())) / 1000);
    const nuovoRisultato = { nome: bloccoAttuale.nome, pianificato_sec: pianificatoSec, effettivo_sec: effettivo };
    const nuoviRisultati = [...risultati, nuovoRisultato];

    if (indice + 1 < blocchi.length) {
      setRisultati(nuoviRisultati);
      setIndice(indice + 1);
      setInizioTs(Date.now());
    } else {
      const precisioni = nuoviRisultati.map((r) => {
        if (r.pianificato_sec === 0) return r.effettivo_sec === 0 ? 100 : 0;
        return Math.max(0, 100 - (Math.abs(r.effettivo_sec - r.pianificato_sec) / r.pianificato_sec) * 100);
      });
      const media = Math.round(precisioni.reduce((a, b) => a + b, 0) / precisioni.length);
      setRisultati(nuoviRisultati);
      setPrecisioneFinale(media);
      setFase("finito");
      startTransition(async () => {
        await salvaTimerSessione(eventoId, nuoviRisultati, media);
      });
    }
  }

  if (fase === "pronto") {
    return (
      <div style={{ maxWidth: 480 }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-text)", textTransform: "uppercase", marginBottom: 10 }}>Scaletta di oggi</div>
          {blocchi.map((b, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: i < blocchi.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span>{b.nome}</span>
              <span style={{ color: "var(--gray-text)" }}>{b.durata_minuti} min</span>
            </div>
          ))}
        </div>
        <button onClick={avvia} className="btn-primary">▶ Avvia diretta</button>
      </div>
    );
  }

  if (fase === "in_corso") {
    const colore = differenza > 30 ? "#DC2626" : differenza > 0 ? "#D97706" : "var(--blue)";
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ textAlign: "center", padding: "32px 20px", background: "var(--dark)", borderRadius: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#a1a1a6", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Blocco {indice + 1} di {blocchi.length}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 18, fontFamily: "Georgia, serif" }}>{bloccoAttuale.nome}</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: colore, fontVariantNumeric: "tabular-nums" }}>{formatta(trascorsoSec)}</div>
          <div style={{ fontSize: 12, color: "#a1a1a6", marginTop: 6 }}>
            pianificato {formatta(pianificatoSec)} · {differenza > 0 ? `${formatta(differenza)} oltre` : `${formatta(-differenza)} rimanenti`}
          </div>
        </div>
        <button onClick={prossimo} className="btn-primary" style={{ width: "100%" }}>
          {indice + 1 < blocchi.length ? "Blocco successivo →" : "Termina diretta"}
        </button>

        {risultati.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Blocchi completati</div>
            {risultati.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", color: "var(--gray-text)" }}>
                <span>{r.nome}</span>
                <span>{formatta(r.effettivo_sec)} / {formatta(r.pianificato_sec)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // fase === "finito"
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ textAlign: "center", padding: "28px 20px", background: "var(--light-bg)", borderRadius: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--gray-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Precisione sui tempi</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: "var(--blue)", fontFamily: "Georgia, serif" }}>{precisioneFinale}%</div>
        {isPending && <p style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 8 }}>Salvataggio…</p>}
      </div>

      <div className="section-label" style={{ marginTop: 0 }}>Dettaglio blocchi</div>
      {risultati.map((r, i) => {
        const diff = r.effettivo_sec - r.pianificato_sec;
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 6, fontSize: 12.5 }}>
            <span>{r.nome}</span>
            <span>
              {formatta(r.effettivo_sec)} / {formatta(r.pianificato_sec)}{" "}
              <span style={{ color: diff === 0 ? "var(--gray-text)" : diff > 0 ? "#DC2626" : "var(--blue)" }}>
                ({diff > 0 ? "+" : ""}{formatta(diff)})
              </span>
            </span>
          </div>
        );
      })}

      <button onClick={avvia} className="btn-primary" style={{ marginTop: 16 }}>↻ Rifai il timer</button>
    </div>
  );
}
