import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import { aggiungiCriterioQualita, rimuoviCriterioQualita } from "@/lib/actions";

export default async function CriteriQualitaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Criteri qualità</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è per il RAD.</p>
      </div>
    );
  }

  const { data: criteri } = await supabase.from("criteri_qualita").select("*").eq("attivo", true).order("ordine");

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Criteri qualità</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        I punti fissi che il reparto Qualità valuta per ogni puntata. Aggiungine di nuovi o disattiva quelli che non servono più.
      </p>

      <form
        action={aggiungiCriterioQualita}
        style={{ display: "flex", gap: 8, marginBottom: 24, maxWidth: 560 }}
      >
        <input
          name="testo"
          type="text"
          required
          placeholder="Es. Chiarezza nella presentazione degli ospiti"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, fontFamily: "inherit" }}
        />
        <button type="submit" className="btn-primary">Aggiungi</button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 560 }}>
        {(criteri ?? []).map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10 }}>
            <span style={{ fontSize: 13 }}>{c.testo}</span>
            <form action={async () => { "use server"; await rimuoviCriterioQualita(c.id); }}>
              <button type="submit" style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                Disattiva
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
