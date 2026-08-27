import { createClient } from "@/lib/supabase/server";
import { createObiettivo, deleteObiettivo } from "@/lib/actions";
import ProgressoManualeSlider from "./progresso-slider";

const TIPO_LABEL: Record<string, string> = {
  task: "Automatico — % task completati (tutti i reparti)",
  social: "Automatico — follower rispetto al target",
  voto: "Automatico — voto medio dei resoconti qualità",
  manuale: "Manuale — imposti tu la percentuale",
};

export default async function ObiettiviPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const isRad = profile.ruolo === "rad";

  const { data: obiettivi } = await supabase
    .from("obiettivi")
    .select("*")
    .order("creato_il", { ascending: true });

  // Dati per i calcoli automatici.
  const { data: tasks } = await supabase.from("tasks").select("completato");
  const taskTotali = (tasks ?? []).length;
  const taskCompletati = (tasks ?? []).filter((t) => t.completato).length;
  const percentualeTask = taskTotali ? Math.round((taskCompletati / taskTotali) * 100) : 0;

  const { data: reportsVoto } = await supabase.from("quality_reports").select("voto");
  const votoMedio = (reportsVoto ?? []).length
    ? (reportsVoto ?? []).reduce((a, r) => a + r.voto, 0) / (reportsVoto ?? []).length
    : 0;
  const percentualeVoto = Math.min(100, Math.round((votoMedio / 5) * 100));

  async function percentualeSocial(piattaforma: string | null, target: number | null) {
    if (!piattaforma || !target) return 0;
    const { data } = await supabase
      .from("social_stats")
      .select("follower")
      .eq("piattaforma", piattaforma)
      .order("mese", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? Math.min(100, Math.round((data.follower / target) * 100)) : 0;
  }

  const obiettiviConProgresso = await Promise.all(
    (obiettivi ?? []).map(async (o) => {
      let percentuale = 0;
      if (o.tipo === "task") percentuale = percentualeTask;
      else if (o.tipo === "voto") percentuale = percentualeVoto;
      else if (o.tipo === "social") percentuale = await percentualeSocial(o.piattaforma, o.target);
      else percentuale = o.progresso_manuale;
      return { ...o, percentuale };
    })
  );

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Obiettivi annui</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 26 }}>
        Dove vuole arrivare Radio Marconi entro fine anno scolastico.
      </p>

      {obiettiviConProgresso.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun obiettivo ancora impostato.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 30 }}>
        {obiettiviConProgresso.map((o) => (
          <div key={o.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, fontFamily: "Georgia, serif" }}>{o.titolo}</div>
                {o.descrizione && <p style={{ fontSize: 12.5, color: "var(--gray-text)", margin: "3px 0 0" }}>{o.descrizione}</p>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif", color: "var(--blue)" }}>
                  {o.percentuale}%
                </span>
                {isRad && (
                  <form action={async () => { "use server"; await deleteObiettivo(o.id); }}>
                    <button type="submit" style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                      Elimina
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div style={{ height: 8, borderRadius: 999, background: "var(--light-bg)", overflow: "hidden", marginTop: 10 }}>
              <div style={{ height: "100%", width: `${o.percentuale}%`, background: "var(--blue)", borderRadius: 999, transition: "width 0.3s ease" }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 10.5, color: "var(--gray-text)" }}>{TIPO_LABEL[o.tipo]}</span>
              {o.scadenza && (
                <span style={{ fontSize: 10.5, color: "var(--gray-text)" }}>
                  Entro {new Date(o.scadenza).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </div>

            {isRad && o.tipo === "manuale" && (
              <ProgressoManualeSlider obiettivoId={o.id} valoreIniziale={o.progresso_manuale} />
            )}
          </div>
        ))}
      </div>

      {isRad && (
        <>
          <div className="section-label" style={{ marginTop: 0 }}>Nuovo obiettivo</div>
          <form
            action={createObiettivo}
            style={{ background: "var(--light-bg)", borderRadius: 14, padding: 18, display: "grid", gap: 12, maxWidth: 520 }}
          >
            <div>
              <label style={labelStyle}>Titolo</label>
              <input name="titolo" type="text" required placeholder="Es. 1000 follower Instagram" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Descrizione (facoltativa)</label>
              <input name="descrizione" type="text" placeholder="Una riga di contesto" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Tipo di calcolo</label>
                <select name="tipo" style={inputStyle} defaultValue="manuale">
                  <option value="manuale">Manuale</option>
                  <option value="task">Automatico — task completati</option>
                  <option value="social">Automatico — follower social</option>
                  <option value="voto">Automatico — voto medio qualità</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Scadenza</label>
                <input name="scadenza" type="date" defaultValue={`${new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear()}-06-30`} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Piattaforma (solo se "follower social")</label>
                <select name="piattaforma" style={inputStyle} defaultValue="">
                  <option value="">—</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Target numerico (es. 1000)</label>
                <input name="target" type="number" min={0} placeholder="Solo per obiettivi social" style={inputStyle} />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ justifySelf: "start" }}>Aggiungi obiettivo</button>
          </form>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
