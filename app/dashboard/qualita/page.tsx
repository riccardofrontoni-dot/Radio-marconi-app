import { submitQualityReport } from "@/lib/actions";

export default function QualitaPage() {
  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>Resoconto puntata</h2>
      <div className="section-label" style={{ marginTop: 0 }}>Reparto qualità</div>

      <form
        action={submitQualityReport}
        style={{ background: "var(--light-bg)", borderRadius: 14, padding: 24, display: "grid", gap: 16, maxWidth: 560 }}
      >
        <Field label="Puntata">
          <input name="puntata_titolo" type="text" required placeholder="Es. Puntata di giovedì — Reparto Speaker" style={inputStyle} />
        </Field>
        <Field label="Punti di forza">
          <textarea name="punti_di_forza" placeholder="Cosa ha funzionato bene" style={{ ...inputStyle, minHeight: 70 }} />
        </Field>
        <Field label="Criticità riscontrate">
          <textarea name="criticita" placeholder="Cosa migliorare per la prossima volta" style={{ ...inputStyle, minHeight: 70 }} />
        </Field>
        <Field label="Voto finale">
          <select name="voto" required style={inputStyle} defaultValue="4">
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          style={{
            justifySelf: "start", padding: "11px 20px", borderRadius: 9, border: "none",
            background: "var(--dark)", color: "var(--white)", fontSize: 13.5, fontWeight: 600,
          }}
        >
          Salva resoconto
        </button>
      </form>
      <p className="placeholder-note">
        Il resoconto viene salvato nel database. La generazione automatica del PDF è il passo successivo — si aggancia qui.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)",
  fontSize: 13.5, fontFamily: "inherit", background: "var(--white)",
};
