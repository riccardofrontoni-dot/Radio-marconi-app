import { createClient } from "@/lib/supabase/server";
import { assignProfile } from "@/lib/actions";

const REPARTI = ["speaker", "social", "tecnico_video", "tecnico_audio", "qualita"];

export default async function AdminPage() {
  const supabase = createClient();

  const { data: pending } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "in_attesa")
    .order("created_at", { ascending: true });

  const { data: active } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "attivo")
    .order("reparto");

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>Amministrazione</h2>

      <div className="section-label" style={{ marginTop: 0 }}>Nuovi iscritti — da assegnare</div>
      {(pending ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuno studente in attesa al momento.</p>
      )}
      {(pending ?? []).map((p) => (
        <form
          key={p.id}
          action={async (formData: FormData) => {
            "use server";
            await assignProfile(p.id, formData.get("reparto") as string, formData.get("ruolo") as string);
          }}
          style={{
            display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 10, alignItems: "center",
            padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8, fontSize: 13,
          }}
        >
          <span>{p.full_name || p.email}</span>
          <select name="reparto" required style={selectStyle}>
            <option value="">Reparto...</option>
            {REPARTI.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select name="ruolo" style={selectStyle} defaultValue="membro">
            <option value="membro">Membro</option>
            <option value="capo">Capo reparto</option>
          </select>
          <button type="submit" style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "var(--blue)", color: "var(--white)", fontSize: 12.5, fontWeight: 600 }}>
            Assegna
          </button>
        </form>
      ))}

      <div className="section-label">Membri attivi</div>
      {(active ?? []).map((p) => (
        <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr auto", gap: 10, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8, fontSize: 13 }}>
          <span>{p.full_name || p.email}</span>
          <span style={{ color: "#0f6e56", fontWeight: 600 }}>{p.reparto}{p.ruolo === "capo" ? " — capo" : ""}</span>
          <span />
        </div>
      ))}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "7px 8px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12.5, fontFamily: "inherit",
};
