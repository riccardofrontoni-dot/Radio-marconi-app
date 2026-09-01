"use client";

import { useState, useTransition } from "react";
import { saveSocialScript, deleteSocialScript } from "@/lib/actions";

type Blocco = {
  key: string;
  titolo: string;
  tipo: "format" | "informativo" | "trend";
  gancio: string;
  link: string;
  corpo: string;
  cta: string;
};

const TIPO_LABEL: Record<Blocco["tipo"], string> = { format: "Format", informativo: "Video informativo", trend: "Trend" };

let contatore = 0;
function nuovaKey() {
  contatore += 1;
  return `nuovo-${contatore}-${Date.now()}`;
}

function bloccoVuoto(): Blocco {
  return { key: nuovaKey(), titolo: "", tipo: "format", gancio: "", link: "", corpo: "", cta: "" };
}

export default function SocialScriptClient({
  eventoId,
  script,
  blocchiIniziali,
  soloLettura,
}: {
  eventoId: string;
  script: { id: string; titolo: string | null } | null;
  blocchiIniziali: { titolo: string | null; tipo: Blocco["tipo"]; gancio: string | null; link: string | null; corpo: string | null; cta: string | null }[];
  soloLettura: boolean;
}) {
  const [titolo, setTitolo] = useState(script?.titolo ?? "");
  const [blocchi, setBlocchi] = useState<Blocco[]>(
    blocchiIniziali.length > 0
      ? blocchiIniziali.map((b) => ({
          key: nuovaKey(),
          titolo: b.titolo ?? "",
          tipo: b.tipo ?? "format",
          gancio: b.gancio ?? "",
          link: b.link ?? "",
          corpo: b.corpo ?? "",
          cta: b.cta ?? "",
        }))
      : [bloccoVuoto()]
  );
  const [isPending, startTransition] = useTransition();
  const [salvato, setSalvato] = useState(false);

  function aggiungiBlocco() {
    setBlocchi((b) => [...b, bloccoVuoto()]);
  }
  function rimuoviBlocco(key: string) {
    setBlocchi((b) => b.filter((x) => x.key !== key));
  }
  function aggiorna(key: string, campo: keyof Blocco, valore: string) {
    setBlocchi((b) => b.map((x) => (x.key === key ? { ...x, [campo]: valore } : x)));
  }

  function handleElimina() {
    if (!script) return;
    startTransition(async () => {
      await deleteSocialScript(script.id, eventoId);
    });
  }

  function handleSalva(formData: FormData) {
    startTransition(async () => {
      await saveSocialScript(eventoId, formData);
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2000);
    });
  }

  if (soloLettura) {
    return (
      <div>
        {!script && <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuno script ancora scritto per questa giornata.</p>}
        {script && (
          <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
            {blocchi.map((b, i) => <BloccoLettura key={b.key} b={b} numero={i + 1} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <a
        href={script ? `/api/social-script-pdf/${eventoId}` : undefined}
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
        <div>
          <label style={labelStyle}>Titolo della giornata</label>
          <input name="titolo" value={titolo} onChange={(e) => setTitolo(e.target.value)} type="text" required placeholder="Es. Script Charleston 08/07" style={inputStyle} />
        </div>

        <div className="section-label" style={{ marginTop: 0 }}>Video</div>

        {blocchi.map((b, i) => (
          <BloccoForm key={b.key} b={b} numero={i + 1} onChange={aggiorna} onRimuovi={rimuoviBlocco} soloUno={blocchi.length === 1} />
        ))}

        <button type="button" onClick={aggiungiBlocco} style={aggiungiBtnStyle}>+ Aggiungi video</button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn-primary">{isPending ? "Salvataggio…" : "Salva script"}</button>
          {salvato && <span style={{ fontSize: 12, color: "#166534" }}>Script salvato.</span>}
        </div>
      </form>

      {script && (
        <button type="button" onClick={handleElimina} style={{ border: "none", background: "none", color: "#c22", fontSize: 12, cursor: "pointer", marginTop: 20 }}>
          Elimina script
        </button>
      )}
    </div>
  );
}

function BloccoForm({ b, numero, onChange, onRimuovi, soloUno }: { b: Blocco; numero: number; onChange: (key: string, campo: keyof Blocco, valore: string) => void; onRimuovi: (key: string) => void; soloUno: boolean }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: "#1F5C33", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{numero}</span>
        <input
          value={b.titolo}
          onChange={(e) => onChange(b.key, "titolo", e.target.value)}
          name="blocco_titolo"
          placeholder="Titolo del video (es. Roma vuota)"
          style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, outline: "none" }}
        />
        {!soloUno && (
          <button type="button" onClick={() => onRimuovi(b.key)} style={{ border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: 6, width: 22, height: 22, fontSize: 12, cursor: "pointer" }}>✕</button>
        )}
      </div>

      <div style={{ padding: 14, display: "grid", gap: 10 }}>
        <div>
          <label style={labelStyle}>Tipo</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(["format", "informativo", "trend"] as const).map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 999, cursor: "pointer", background: b.tipo === t ? "var(--light-bg)" : "var(--white)" }}>
                <input type="radio" name={`tipo_radio_${b.key}`} checked={b.tipo === t} onChange={() => onChange(b.key, "tipo", t)} style={{ margin: 0 }} />
                {TIPO_LABEL[t]}
              </label>
            ))}
          </div>
          <input type="hidden" name="blocco_tipo" value={b.tipo} />
        </div>
        <div>
          <label style={labelStyle}>Gancio (primi secondi)</label>
          <textarea value={b.gancio} onChange={(e) => onChange(b.key, "gancio", e.target.value)} name="blocco_gancio" placeholder="Cosa si dice/si vede per catturare l'attenzione" style={{ ...inputStyle, minHeight: 50 }} />
        </div>
        <div>
          <label style={labelStyle}>Link di riferimento (facoltativo, uno per riga)</label>
          <textarea value={b.link} onChange={(e) => onChange(b.key, "link", e.target.value)} name="blocco_link" placeholder="Link a video da cui si è preso spunto" style={{ ...inputStyle, minHeight: 40 }} />
        </div>
        <div>
          <label style={labelStyle}>Corpo (cosa viene detto)</label>
          <textarea value={b.corpo} onChange={(e) => onChange(b.key, "corpo", e.target.value)} name="blocco_corpo" placeholder="Testo/scaletta del video" style={{ ...inputStyle, minHeight: 100 }} />
        </div>
        <div>
          <label style={labelStyle}>CTA finale</label>
          <textarea value={b.cta} onChange={(e) => onChange(b.key, "cta", e.target.value)} name="blocco_cta" placeholder="Chiusura del video" style={{ ...inputStyle, minHeight: 50 }} />
        </div>
      </div>
    </div>
  );
}

function BloccoLettura({ b, numero }: { b: Blocco; numero: number }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ background: "#1F5C33", padding: "8px 14px", color: "#fff", fontSize: 13, fontWeight: 700 }}>
        {numero} {b.titolo}
      </div>
      <div style={{ padding: 14, display: "grid", gap: 8, fontSize: 12.5 }}>
        <div><b>Gancio:</b> {b.gancio || "—"}</div>
        {b.link && <div><b>Link:</b> {b.link}</div>}
        <div><b>Corpo:</b> {b.corpo || "—"}</div>
        <div><b>CTA:</b> {b.cta || "—"}</div>
      </div>
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
