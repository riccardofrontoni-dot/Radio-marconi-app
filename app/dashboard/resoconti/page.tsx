import { createClient } from "@/lib/supabase/server";
import { updateQualityFeedback } from "@/lib/actions";

const STATO_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  in_revisione: { label: "In revisione", bg: "#FEF3C7", fg: "#92400E" },
  rimandato: { label: "Rimandato indietro", bg: "#FEE2E2", fg: "#991B1B" },
  approvato: { label: "Approvato", bg: "#DCFCE7", fg: "#166534" },
};

export default async function ResocontiPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Resoconti qualità</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è visibile solo al RAD.</p>
      </div>
    );
  }

  const { data: reports } = await supabase
    .from("quality_reports")
    .select("*")
    .order("creato_il", { ascending: false });

  const autoreIds = Array.from(new Set((reports ?? []).map((r) => r.creato_da).filter(Boolean)));
  const eventoIds = Array.from(new Set((reports ?? []).map((r) => r.evento_id).filter(Boolean)));

  const { data: autori } = autoreIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", autoreIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const { data: eventi } = eventoIds.length
    ? await supabase.from("events").select("id, titolo, quando").in("id", eventoIds)
    : { data: [] as { id: string; titolo: string; quando: string }[] };

  const autoreById = (id: string) => (autori ?? []).find((a) => a.id === id);
  const eventoById = (id: string) => (eventi ?? []).find((e) => e.id === id);

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Resoconti qualità</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Tutti i resoconti inviati dal reparto qualità. Lascia un feedback e rimandali indietro se serve.
      </p>

      {(reports ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun resoconto ancora inviato.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(reports ?? []).map((r) => {
          const autore = autoreById(r.creato_da);
          const evento = r.evento_id ? eventoById(r.evento_id) : null;
          const stato = STATO_LABEL[r.stato] ?? STATO_LABEL.in_revisione;

          return (
            <details key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "14px 18px" }}>
              <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.puntata_titolo}</div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 2 }}>
                    {autore ? autore.full_name || autore.email : "Autore sconosciuto"}
                    {evento && ` · ${evento.titolo} (${new Date(evento.quando).toLocaleDateString("it-IT", { day: "numeric", month: "short" })})`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif" }}>{r.voto}/5</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: stato.bg, color: stato.fg }}>
                    {stato.label}
                  </span>
                </div>
              </summary>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "grid", gap: 10 }}>
                {r.punti_di_forza && (
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-text)" }}>Punti di forza</div>
                    <p style={{ fontSize: 13, margin: "2px 0 0" }}>{r.punti_di_forza}</p>
                  </div>
                )}
                {r.criticita && (
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-text)" }}>Criticità</div>
                    <p style={{ fontSize: 13, margin: "2px 0 0" }}>{r.criticita}</p>
                  </div>
                )}

                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await updateQualityFeedback(r.id, formData);
                  }}
                  style={{ display: "grid", gap: 8, marginTop: 4 }}
                >
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Il tuo feedback</label>
                    <textarea
                      name="feedback_rad"
                      defaultValue={r.feedback_rad ?? ""}
                      placeholder="Note per chi ha scritto il resoconto…"
                      style={{ width: "100%", minHeight: 60, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12.5, fontFamily: "inherit" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select name="stato" defaultValue={r.stato} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12.5, fontFamily: "inherit" }}>
                      <option value="in_revisione">In revisione</option>
                      <option value="rimandato">Rimanda indietro</option>
                      <option value="approvato">Approva</option>
                    </select>
                    <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: 12.5 }}>
                      Salva
                    </button>
                  </div>
                </form>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
