"use client";

import { useState, useTransition } from "react";
import { saveScript, deleteScript } from "@/lib/actions";

type Blocco = {
  key: string;
  tipo: "blocco" | "pausa" | "traccia";
  nome: string;
  sottotitolo: string;
  materiale: string;
  punti: string;
  durata_minuti: number;
};

let contatore = 0;
function nuovaKey() {
  contatore += 1;
  return `nuovo-${contatore}-${Date.now()}`;
}

function blocchiVuoti(): Blocco[] {
  return [
    { key: nuovaKey(), tipo: "blocco", nome: "Introduzione", sottotitolo: "", materiale: "", punti: "", durata_minuti: 10 },
  ];
}

export default function ScriptClient({
  eventoId,
  script,
  blocchiIniziali,
  soloLettura,
}: {
  eventoId: string;
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
    setBlocchi((b) => [...b, { key: nuovaKey(), tipo, nome: default_nome, sottotitolo: "", materiale: "", punti: "", durata_minuti: tipo === "blocco" ? 15 : 2 }]);
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

  if (soloLettura) {
    return (
      <div>
        {!script && <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuno script ancora scritto per questa puntata.</p>}
        {script && (
          <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
            <div className="card"><b>{script.titolo}</b>{script.descrizione_breve && <p style={{ fontSize: 13, marginTop: 6 }}>{script.descrizione_breve}</p>}</div>
            {blocchi.map((b) => <BloccoLettura key={b.key} b={b} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <a
        href={script ? `/api/script-pdf/${eventoId}` : undefined}
        target="_blank"
        rel="noreferrer"
        className="btn-primary"
        style={{
          display: "inline-block", marginBottom: 20, textDecoration: "none",
          opacity: script ? 1 : 0.4, pointerEvents: script ? "auto" : "none",
        }}
      >
        📄 Genera PDF
      </a>
      {!script && <p style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: -14, marginBottom: 20 }}>Salva lo script una prima volta per generare il PDF.</p>}

      <form action={handleSalva} style={{ display: "grid", gap: 18 }}>
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-text)", textTransform: "uppercase" }}>Informazioni</div>
          <div>
            <label style={labelStyle}>Titolo puntata</label>
            <input name="titolo" value={titolo} onChange={(e) => setTitolo(e.target.value)} type="text" required placeholder="Es. Scienza tra le stelle" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Materiale (link foto/video)</label>
            <input name="materiale" value={materiale} onChange={(e) => setMateriale(e.target.value)} type="text" placeholder="Link Video YouTube o foto" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Descrizione breve</label>
            <textarea name="descrizione_breve" value={descrizioneBreve} onChange={(e) => setDescrizioneBreve(e.target.value)} style={{ ...inputStyle, minHeight: 50 }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="section-label" style={{ margin: 0 }}>Scaletta puntata</div>
          <span style={{ fontSize: 12, color: "var(--gray-text)" }}>Durata totale: {durataTotale} min</span>
        </div>

        {blocchi.map((b) => (
          <BloccoForm key={b.key} b={b} onChange={aggiorna} onRimuovi={rimuoviBlocco} />
        ))}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => aggiungiBlocco("blocco")} style={aggiungiBtnStyle}>+ Blocco</button>
          <button type="button" onClick={() => aggiungiBlocco("pausa")} style={aggiungiBtnStyle}>+ Pausa</button>
          <button type="button" onClick={() => aggiungiBlocco("traccia")} style={aggiungiBtnStyle}>+ Traccia</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn-primary">{isPending ? "Salvataggio…" : "Salva script"}</button>
          {salvato && <span style={{ fontSize: 12, color: "#166534" }}>Script salvato.</span>}
        </div>
      </form>

      {script && (
        <button
          type="button"
          onClick={handleElimina}
          style={{ border: "none", background: "none", color: "#c22", fontSize: 12, cursor: "pointer", marginTop: 20 }}
        >
          Elimina script
        </button>
      )}
    </div>
  );
}

function BloccoForm({ b, onChange, onRimuovi }: { b: Blocco; onChange: (key: string, campo: keyof Blocco, valore: string | number) => void; onRimuovi: (key: string) => void }) {
  const coloreBarraTipo: Record<Blocco["tipo"], string> = { blocco: "#1F5C33", pausa: "#991B1B", traccia: "var(--gray-text)" };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: coloreBarraTipo[b.tipo], padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <input type="hidden" name="blocco_tipo" value={b.tipo} />
        <input
          value={b.nome}
          onChange={(e) => onChange(b.key, "nome", e.target.value)}
          name="blocco_nome"
          placeholder="Nome del blocco"
          style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, outline: "none" }}
        />
        <input
          type="number"
          min={0}
          value={b.durata_minuti}
          onChange={(e) => onChange(b.key, "durata_minuti", Number(e.target.value))}
          name="blocco_durata"
          style={{ width: 46, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 12.5, borderRadius: 6, padding: "3px 6px", textAlign: "center" }}
        />
        <span style={{ color: "#fff", fontSize: 11 }}>min</span>
        <button type="button" onClick={() => onRimuovi(b.key)} style={{ border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: 6, width: 22, height: 22, fontSize: 12, cursor: "pointer" }}>✕</button>
      </div>

      {b.tipo === "blocco" && (
        <div style={{ padding: 14, display: "grid", gap: 10 }}>
          <div>
            <label style={labelStyle}>Sottotitolo</label>
            <input
              value={b.sottotitolo}
              onChange={(e) => onChange(b.key, "sottotitolo", e.target.value)}
              name="blocco_sottotitolo"
              type="text"
              placeholder="Es. Sai cosa significa scienza?"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Materiale</label>
            <input
              value={b.materiale}
              onChange={(e) => onChange(b.key, "materiale", e.target.value)}
              name="blocco_materiale"
              type="text"
              placeholder="Link o riferimento materiale"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Punti da toccare (un punto per riga — niente papiri!)</label>
            <textarea
              value={b.punti}
              onChange={(e) => onChange(b.key, "punti", e.target.value)}
              name="blocco_punti"
              placeholder={"Saluti\nPresentazione format\nIntroduzione dello speaker"}
              style={{ ...inputStyle, minHeight: 80 }}
            />
          </div>
        </div>
      )}
      {b.tipo !== "blocco" && (
        <>
          <input type="hidden" name="blocco_sottotitolo" value="" />
          <input type="hidden" name="blocco_materiale" value="" />
          <input type="hidden" name="blocco_punti" value="" />
        </>
      )}
    </div>
  );
}

function BloccoLettura({ b }: { b: Blocco }) {
  const coloreBarraTipo: Record<Blocco["tipo"], string> = { blocco: "#1F5C33", pausa: "#991B1B", traccia: "var(--gray-text)" };
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: coloreBarraTipo[b.tipo], padding: "8px 14px", display: "flex", justifyContent: "space-between", color: "#fff", fontSize: 13, fontWeight: 700 }}>
        <span>{b.nome}</span>
        <span>{b.durata_minuti} min</span>
      </div>
      {b.tipo === "blocco" && (b.sottotitolo || b.punti) && (
        <div style={{ padding: 14 }}>
          {b.sottotitolo && <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{b.sottotitolo}</p>}
          {b.punti && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--gray-text)" }}>
              {b.punti.split("\n").filter(Boolean).map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const aggiungiBtnStyle: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px dashed var(--border)", background: "var(--light-bg)", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)",
  fontSize: 12.5, fontFamily: "inherit", background: "var(--white)",
};
