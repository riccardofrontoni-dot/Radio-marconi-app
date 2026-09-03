"use client";

import { useState, useTransition } from "react";
import { creaContenutoSocial, eliminaContenutoSocial } from "@/lib/actions";

const TIPO_LABEL: Record<string, string> = { format: "Format", informativo: "Video informativo", trend: "Trend", altro: "Altro" };
const TIPO_COLORE: Record<string, string> = { format: "#2C7A45", informativo: "#0369A1", trend: "#6B4FA0", altro: "#6E6E73" };

type Contenuto = {
  id: string;
  nome: string;
  tipologia: string;
  data_pubblicazione: string | null;
  visualizzazioni: number;
  engagement: number;
  retention_rate: number;
  follower_acquisiti: number;
};

export default function AnalisiSocialClient({ contenuti }: { contenuti: Contenuto[] }) {
  const [isPending, startTransition] = useTransition();
  const [mostraForm, setMostraForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function mostraToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function salva(formData: FormData) {
    startTransition(async () => {
      await creaContenutoSocial(formData);
      setMostraForm(false);
      mostraToast("Scheda contenuto salvata");
    });
  }

  function elimina(id: string) {
    startTransition(async () => {
      await eliminaContenutoSocial(id);
      mostraToast("Scheda eliminata");
    });
  }

  const migliore = [...contenuti].sort((a, b) => b.engagement - a.engagement)[0];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Analisi social</h2>
        <button onClick={() => setMostraForm(!mostraForm)} className="btn-primary" style={{ fontSize: 12.5 }}>
          {mostraForm ? "Annulla" : "+ Nuovo contenuto"}
        </button>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Una scheda per ogni contenuto pubblicato — inserimento manuale per ora, in attesa del collegamento automatico con le API Instagram.
      </p>

      {mostraForm && (
        <form
          action={salva}
          style={{ background: "var(--light-bg)", borderRadius: 14, padding: 18, display: "grid", gap: 12, marginBottom: 24, maxWidth: 560 }}
        >
          <div>
            <label style={labelStyle}>Nome contenuto</label>
            <input name="nome" type="text" required placeholder="Es. Reel Charleston — Roma vuota" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Tipologia</label>
              <select name="tipologia" defaultValue="format" style={inputStyle}>
                <option value="format">Format</option>
                <option value="informativo">Video informativo</option>
                <option value="trend">Trend</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data pubblicazione</label>
              <input name="data_pubblicazione" type="date" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Visualizzazioni</label>
              <input name="visualizzazioni" type="number" min="0" placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Engagement (%)</label>
              <input name="engagement" type="number" min="0" max="100" step="0.1" placeholder="0" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Retention rate (%)</label>
              <input name="retention_rate" type="number" min="0" max="100" step="0.1" placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Follower acquisiti</label>
              <input name="follower_acquisiti" type="number" min="0" placeholder="0" style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={isPending} className="btn-primary" style={{ marginTop: 4 }}>Salva scheda</button>
        </form>
      )}

      {migliore && migliore.engagement > 0 && (
        <div style={{ background: "linear-gradient(135deg, #1F5C33, #3E9D5C)", borderRadius: 16, padding: "18px 22px", marginBottom: 24, color: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.85, marginBottom: 6 }}>
            🏆 Contenuto con più engagement
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Georgia, serif" }}>{migliore.nome}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>{migliore.engagement}% engagement · {migliore.visualizzazioni.toLocaleString("it-IT")} visualizzazioni</div>
        </div>
      )}

      {contenuti.length === 0 && !mostraForm && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun contenuto ancora registrato.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {contenuti.map((c) => (
          <div key={c.id} className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.3 }}>{c.nome}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: TIPO_COLORE[c.tipologia] ?? "#6E6E73", borderRadius: 999, padding: "3px 8px", flexShrink: 0 }}>
                {TIPO_LABEL[c.tipologia] ?? c.tipologia}
              </span>
            </div>
            {c.data_pubblicazione && (
              <div style={{ fontSize: 11, color: "var(--gray-text)", marginBottom: 14 }}>
                {new Date(c.data_pubblicazione).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <Stat label="Visualizzazioni" value={c.visualizzazioni.toLocaleString("it-IT")} />
              <Stat label="Engagement" value={`${c.engagement}%`} />
              <Stat label="Follower acquisiti" value={`+${c.follower_acquisiti}`} />
              <div>
                <div style={{ fontSize: 10.5, color: "var(--gray-text)", marginBottom: 3 }}>Retention</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif" }}>{c.retention_rate}%</div>
              </div>
            </div>

            <div style={{ height: 7, borderRadius: 999, background: "var(--light-bg)", overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${Math.min(c.retention_rate, 100)}%`, background: "var(--blue)", borderRadius: 999 }} />
            </div>

            <button onClick={() => elimina(c.id)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11, cursor: "pointer" }}>
              Elimina
            </button>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "fixed", bottom: 26, right: 26, background: "var(--dark)", color: "#fff", padding: "13px 18px",
          borderRadius: 13, fontSize: 13.5, display: "flex", alignItems: "center", gap: 10,
          transform: toast ? "translateY(0)" : "translateY(140%)", transition: "transform 0.3s cubic-bezier(.22,.9,.32,1)", zIndex: 60,
          boxShadow: "0 14px 30px -10px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--gray-text)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif" }}>{value}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
