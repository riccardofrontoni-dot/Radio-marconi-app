import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import { svuotaStorico } from "@/lib/actions";
import { repartoColor, repartoLabel } from "@/lib/reparti";

const TIPO_LABEL: Record<string, string> = {
  resoconto_qualita: "Resoconto qualità",
  task: "Task",
  evento: "Evento",
  progetto: "Progetto",
};
const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const ORDINE_REPARTI = ["speaker", "social", "tecnico_video", "tecnico_audio", "qualita", "generale"];

export default async function StoricoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Storico</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è visibile solo al RAD.</p>
      </div>
    );
  }

  const { data: movimenti } = await supabase
    .from("registro_attivita")
    .select("*")
    .order("creato_il", { ascending: false })
    .limit(500);

  const autoreIds = Array.from(new Set((movimenti ?? []).map((e) => e.eseguito_da).filter(Boolean)));
  const { data: autori } = autoreIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", autoreIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const nomeAutore = (id: string | null) => {
    if (!id) return "Sistema";
    const a = (autori ?? []).find((x) => x.id === id);
    return a ? (a.full_name || a.email) : "—";
  };

  // --- raggruppa per mese, poi per reparto dentro al mese ---
  const mesi: { chiave: string; label: string; reparti: { reparto: string; movimenti: any[] }[] }[] = [];
  (movimenti ?? []).forEach((m) => {
    const d = new Date(m.creato_il);
    const chiaveMese = `${d.getFullYear()}-${d.getMonth()}`;
    let gruppoMese = mesi.find((g) => g.chiave === chiaveMese);
    if (!gruppoMese) {
      gruppoMese = { chiave: chiaveMese, label: `${MESI[d.getMonth()]} ${d.getFullYear()}`, reparti: [] };
      mesi.push(gruppoMese);
    }
    const reparto = m.reparto || "generale";
    let gruppoReparto = gruppoMese.reparti.find((r) => r.reparto === reparto);
    if (!gruppoReparto) {
      gruppoReparto = { reparto, movimenti: [] };
      gruppoMese.reparti.push(gruppoReparto);
    }
    gruppoReparto.movimenti.push(m);
  });
  mesi.forEach((g) => g.reparti.sort((a, b) => ORDINE_REPARTI.indexOf(a.reparto) - ORDINE_REPARTI.indexOf(b.reparto)));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Storico</h2>
        {(movimenti ?? []).length > 0 && (
          <form action={svuotaStorico}>
            <button
              type="submit"
              style={{ border: "1px solid #FCA5A5", background: "#FEE2E2", color: "#991B1B", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Elimina storico
            </button>
          </form>
        )}
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Cosa è stato creato ed eliminato, diviso per mese e per reparto — visibile solo a voi RAD.
      </p>

      {mesi.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun movimento registrato ancora.</p>
      )}

      {mesi.map((gm) => (
        <div key={gm.chiave} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif", marginBottom: 12, textTransform: "capitalize" }}>
            {gm.label}
          </div>

          {gm.reparti.map((gr) => (
            <div key={gr.reparto} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: gr.reparto === "generale" ? "#6E6E73" : repartoColor(gr.reparto) }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {gr.reparto === "generale" ? "Generale" : repartoLabel(gr.reparto)}
                </span>
                <span style={{ fontSize: 11, color: "var(--gray-text)" }}>· {gr.movimenti.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {gr.movimenti.map((e) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12.5 }}>
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: "#fff",
                        background: e.azione === "creato" ? "#2C7A45" : "#DC2626",
                      }}
                    >
                      {e.azione === "creato" ? "+" : "–"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{TIPO_LABEL[e.tipo] ?? e.tipo}</span>
                      {" — "}{e.descrizione}
                    </div>
                    <div style={{ color: "var(--gray-text)", fontSize: 11, flexShrink: 0, textAlign: "right" }}>
                      {nomeAutore(e.eseguito_da)}<br />
                      {new Date(e.creato_il).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
