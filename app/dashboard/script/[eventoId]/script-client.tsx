"use client";

import { useState, useTransition } from "react";
import { saveScript, deleteScript } from "@/lib/actions";

const TIPO_LABEL: Record<string, string> = { diretta: "Diretta", riunione: "Riunione", altro: "Altro" };
const TIPO_DOT: Record<Blocco["tipo"], string> = { blocco: "#1F5C33", pausa: "#991B1B", traccia: "var(--gray-text)" };

type Blocco = {
  key: string;
  tipo: "blocco" | "pausa" | "traccia";
  nome: string;
  sottotitolo: string;
  materiale: string;
  punti: string;
  durata_minuti: number;
};

type Evento = { titolo: string; quando: string; fine: string | null; tipo: string };

let contatore = 0;
function nuovaKey() {
  contatore += 1;
  return `nuovo-${contatore}-${Date.now()}`;
}

function blocchiVuoti(): Blocco[] {
  return [
    { key: nuovaKey(), tipo: "blocco", nome: "Apertura", sottotitolo: "", materiale: "", punti: "", durata_minuti: 2 },
  ];
}

export default function ScriptClient({
  eventoId,
  evento,
  nomiPartecipanti,
  script,
  blocchiIniziali,
  soloLettura,
}: {
  eventoId: string;
  evento: Evento;
  nomiPartecipanti: string[];
  script: { id: string; titolo: string | null; materiale: string | null; descrizione_breve: string | null } | null;
  blocchiIniziali: { tipo: "blocco" | "pausa" | "traccia"; nome: string | null; sottotitolo: string | null; materiale: string | null; punti: string | null; durata_minuti: number }[];
  soloLettura: boolean;
}) {
  const [titolo, setTitolo] = useState(script?.titolo ?? "");
  const [materiale, setMateriale] = useState(script?.materiale ?? "");
  const [descrizioneBreve, setDescrizioneBreve] = useState(script?.descrizione_breve ?? "");
  const [blocchi, setBlocchi] = useState<Blocco[]>(
    blocchiIniziali.length > 0
      ? blocchiIniziali.map((b) => ({
          key: nuovaKey(),
          tipo: b.tipo,
          nome: b.nome ?? "",
          sottotitolo: b.sottotitolo ?? "",
          materiale: b.materiale ?? "",
          punti: b.punti ?? "",
          durata_minuti: b.durata_minuti,
        }))
      : blocchiVuoti()
  );
  const [isPending, startTransition] = useTransition();
  const [salvato, setSalvato] = useState(false);

  function aggiungiBlocco(tipo: Blocco["tipo"]) {
    const default_nome = tipo === "pausa" ? "Pausa: Musica" : tipo === "traccia" ? "Traccia: titolo" : "Nuovo blocco";
    setBlocchi((b) => [...b, { key: nuovaKey(), tipo, nome: default_nome, sottotitolo: "", materiale: "", punti: "", durata_minuti: tipo === "blocco" ? 5 : 2 }]);
  }
  function rimuoviBlocco(key: string) {
    setBlocchi((b) => b.filter((x) => x.key !== key));
  }
  function aggiorna(key: string, campo: keyof Blocco, valore: string | number) {
    setBlocchi((b) => b.map((x) => (x.key === key ? { ...x, [campo]: valore } : x)));
  }

  function handleElimina() {
    if (!script) return;
    startTransition(async () => {
      await deleteScript(script.id, eventoId);
    });
  }

  function handleSalva(formData: FormData) {
    startTransition(async () => {
      await saveScript(eventoId, formData);
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2000);
    });
  }

  const durataTotale = blocchi.reduce((a, b) => a + (Number(b.durata_minuti) || 0), 0);

  const dataEvento = new Date(evento.quando);
  const oraInizio = dataEvento.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const oraFine = evento.fine ? new Date(evento.fine).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : null;
  const sottotitoloParti = [
    dataEvento.toLocaleDateString("it-IT", { day: "numeric", month: "long" }),
    oraFine ? `${oraInizio}–${oraFine}` : oraInizio,
    nomiPartecipanti.length > 0 ? nomiPartecipanti.join(", ") : null,
  ].filter(Boolean);

  if (soloLettura) {
    return (
      <div className="q-page fade-in-up">
        <div className="val-eyebrow">Speaker · {TIPO_LABEL[evento.tipo] ?? evento.tipo}</div>
        <h1 className="val-title">{evento.titolo}</h1>
        <p className="val-subtitle">{sottotitoloParti.join(" · ")}</p>

        {!script && <p className="placeholder-note" style={{ marginTop: 20 }}>Nessuno script ancora scritto per questa puntata.</p>}
        {script && (
          <div className="card card-static" style={{ padding: "6px 24px", marginTop: 20 }}>
            {script.descrizione_breve && (
              <div className="scr-section" style={{ borderTop: "none", paddingTop: 18 }}>
                <p style={{ fontSize: 13.5, color: "var(--gray-text)", margin: 0 }}>{script.descrizione_breve}</p>
              </div>
            )}
            {blocchi.map((b) => (
              <div key={b.key} className="scr-section">
                <div className="scr-section-head">
                  <span className="scr-dot" style={{ background: TIPO_DOT[b.tipo] }} />
                  <span style={{ fontSize: 15, fontWeight: 620, color: "var(--dark)", flex: 1 }}>{b.nome}</span>
                  <span style={{ fontSize: 11.5, color: "#AEAEB2" }}>{b.durata_minuti} min</span>
                </div>
                {b.sottotitolo && <p style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 6px" }}>{b.sottotitolo}</p>}
                {b.punti && (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--gray-text)", lineHeight: 1.7 }}>
                    {b.punti.split("\n").filter(Boolean).map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="q-page fade-in-up">
      <div className="val-eyebrow">Speaker · {TIPO_LABEL[evento.tipo] ?? evento.tipo}</div>
      <h1 className="val-title">{evento.titolo}</h1>
      <p className="val-subtitle" style={{ marginBottom: 4 }}>{sottotitoloParti.join(" · ")}</p>
      <div style={{ display: "flex", gap: 20, marginTop: 14, marginBottom: 6 }}>
        <div style={{ fontSize: 12.5, color: "var(--gray-text)" }}>
          <span style={{ color: "var(--dark)", fontWeight: 600 }}>{blocchi.length}</span> {blocchi.length === 1 ? "blocco" : "blocchi"}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--gray-text)" }}>
          durata stimata <span style={{ color: "var(--dark)", fontWeight: 600 }}>{durataTotale} min</span>
        </div>
      </div>

      <form action={handleSalva}>
        <div className="card card-static" style={{ padding: "4px 24px", marginTop: 18, marginBottom: 18 }}>
          <div className="evt-field">
            <label className="evt-label">Titolo puntata (facoltativo, per la copertina del PDF)</label>
            <input name="titolo" value={titolo} onChange={(e) => setTitolo(e.target.value)} type="text" placeholder="Es. Scienza tra le stelle" className="evt-input" />
          </div>
          <div className="evt-field">
            <label className="evt-label">Materiale (link foto/video)</label>
            <input name="materiale" value={materiale} onChange={(e) => setMateriale(e.target.value)} type="text" placeholder="Link Video YouTube o foto" className="evt-input" />
          </div>
          <div className="evt-field" style={{ borderBottom: "none" }}>
            <label className="evt-label">Descrizione breve</label>
            <textarea name="descrizione_breve" value={descrizioneBreve} onChange={(e) => setDescrizioneBreve(e.target.value)} className="evt-input" style={{ minHeight: 44 }} />
          </div>
        </div>

        <div className="card card-static" style={{ padding: "4px 24px" }}>
          {blocchi.map((b, i) => (
            <BloccoForm key={b.key} b={b} indice={i} onChange={aggiorna} onRimuovi={rimuoviBlocco} />
          ))}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "18px 0" }}>
            <button type="button" onClick={() => aggiungiBlocco("blocco")} className="evt-pill">+ Blocco</button>
            <button type="button" onClick={() => aggiungiBlocco("pausa")} className="evt-pill">+ Pausa</button>
            <button type="button" onClick={() => aggiungiBlocco("traccia")} className="evt-pill">+ Traccia</button>
          </div>
        </div>

        <div className="q-actions" style={{ alignItems: "center" }}>
          <button type="submit" className="q-btn-primary">{isPending ? "Salvataggio…" : "Salva script"}</button>
          <a
            href={script ? `/api/script-pdf/${eventoId}` : undefined}
            target="_blank"
            rel="noreferrer"
            className="q-btn-secondary"
            style={{ textDecoration: "none", opacity: script ? 1 : 0.4, pointerEvents: script ? "auto" : "none" }}
          >
            📄 Genera PDF
          </a>
          {salvato && <span style={{ fontSize: 12, color: "#166534" }}>Script salvato.</span>}
        </div>
        {!script && <p style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 8 }}>Salva lo script una prima volta per generare il PDF.</p>}
      </form>

      {script && (
        <button
          type="button"
          onClick={handleElimina}
          style={{ border: "none", background: "none", color: "#c22", fontSize: 12, cursor: "pointer", marginTop: 18, padding: 0 }}
        >
          Elimina script
        </button>
      )}
    </div>
  );
}

function BloccoForm({
  b, indice, onChange, onRimuovi,
}: {
  b: Blocco; indice: number;
  onChange: (key: string, campo: keyof Blocco, valore: string | number) => void;
  onRimuovi: (key: string) => void;
}) {
  return (
    <div className="scr-section">
      <input type="hidden" name="blocco_tipo" value={b.tipo} />
      <div className="scr-section-head">
        <span className="scr-dot" style={{ background: TIPO_DOT[b.tipo] }} />
        <input
          value={b.nome}
          onChange={(e) => onChange(b.key, "nome", e.target.value)}
          name="blocco_nome"
          placeholder={indice === 0 ? "Apertura" : "Nome del blocco"}
          className="scr-section-name"
        />
        <div className="scr-section-meta">
          <input
            type="number"
            min={0}
            value={b.durata_minuti}
            onChange={(e) => onChange(b.key, "durata_minuti", Number(e.target.value))}
            name="blocco_durata"
            className="scr-duration-input"
          />
          <span style={{ fontSize: 11.5, color: "#AEAEB2" }}>min</span>
          <button type="button" onClick={() => onRimuovi(b.key)} className="scr-remove" aria-label="Rimuovi blocco">✕</button>
        </div>
      </div>

      {b.tipo === "blocco" ? (
        <>
          <input
            value={b.sottotitolo}
            onChange={(e) => onChange(b.key, "sottotitolo", e.target.value)}
            name="blocco_sottotitolo"
            type="text"
            placeholder="Sottotitolo (facoltativo)"
            className="scr-plain"
            style={{ fontWeight: 600, marginBottom: 8 }}
          />
          <textarea
            value={b.punti}
            onChange={(e) => onChange(b.key, "punti", e.target.value)}
            name="blocco_punti"
            rows={3}
            placeholder={"Punti da toccare, un punto per riga — niente papiri!\nEs. Saluti\nPresentazione format"}
            className="scr-plain"
          />
          <input
            value={b.materiale}
            onChange={(e) => onChange(b.key, "materiale", e.target.value)}
            name="blocco_materiale"
            type="text"
            placeholder="Link o riferimento materiale (facoltativo)"
            className="scr-plain"
            style={{ fontSize: 12.5, color: "var(--gray-text)", marginTop: 6 }}
          />
        </>
      ) : (
        <>
          <input type="hidden" name="blocco_sottotitolo" value="" />
          <input type="hidden" name="blocco_materiale" value="" />
          <input type="hidden" name="blocco_punti" value="" />
        </>
      )}
    </div>
  );
}
