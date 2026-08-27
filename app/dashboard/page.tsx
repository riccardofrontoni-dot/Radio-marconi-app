import { createClient } from "@/lib/supabase/server";
import { repartoColor } from "@/lib/reparti";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto)
    .order("created_at", { ascending: true });

  const { data: nextEvent } = await supabase
    .from("events")
    .select("*")
    .gte("quando", new Date().toISOString())
    .order("quando", { ascending: true })
    .limit(1)
    .maybeSingle();

  const daCompletare = (tasks ?? []).filter((t) => !t.completato).length;
  const isCapo = profile.ruolo === "capo";

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22 }}>Home</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 13, marginTop: 4 }}>
          Ciao, {profile.full_name || profile.email}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 28 }}>
        <div className="card">
          <div style={{ fontSize: 12.5, color: "var(--gray-text)", marginBottom: 6 }}>Task da completare</div>
          <div style={{ fontSize: 24, fontWeight: 600, fontFamily: "Georgia, serif" }}>{daCompletare}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12.5, color: "var(--gray-text)", marginBottom: 6 }}>Prossimo evento</div>
          <div style={{ fontSize: 24, fontWeight: 600, fontFamily: "Georgia, serif" }}>
            {nextEvent ? new Date(nextEvent.quando).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "—"}
          </div>
        </div>
      </div>

      {isCapo && <TeamOverview profile={profile} />}

      <div className="section-label">Il tuo processo</div>
      {(tasks ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>
          Nessun task ancora assegnato al tuo reparto.
        </p>
      )}
      {(tasks ?? []).map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex", alignItems: "center", padding: "12px 14px",
            border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8, fontSize: 13.5,
          }}
        >
          <span
            style={{
              width: 18, height: 18, borderRadius: "50%", marginRight: 12, flexShrink: 0,
              border: t.completato ? "none" : "1.5px solid var(--border)",
              background: t.completato ? "var(--blue)" : "transparent",
              display: "inline-block",
            }}
          />
          <span style={{ textDecoration: t.completato ? "line-through" : "none", color: t.completato ? "#a1a1a6" : "var(--dark)" }}>
            {t.titolo}
          </span>
        </div>
      ))}
    </div>
  );
}

async function TeamOverview({ profile }: { profile: { id: string; reparto: string } }) {
  const supabase = createClient();

  const { data: membri } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("reparto", profile.reparto)
    .eq("status", "attivo");

  const { data: taskReparto } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto);

  const oggi = new Date();
  const traDueGiorni = new Date();
  traDueGiorni.setDate(oggi.getDate() + 2);

  const urgenti = (taskReparto ?? []).filter((t) => {
    if (t.completato || !t.puntata_data) return false;
    const scadenza = new Date(t.puntata_data);
    return scadenza <= traDueGiorni;
  });

  const { data: prossimeDirette } = await supabase
    .from("events")
    .select("id, titolo, quando, membri")
    .gte("quando", oggi.toISOString())
    .order("quando", { ascending: true })
    .limit(10);

  const membriIds = new Set((membri ?? []).map((m) => m.id));
  const direttePerReparto = (prossimeDirette ?? [])
    .filter((e) => (e.membri ?? []).some((mid: string) => membriIds.has(mid)))
    .slice(0, 3);

  const nomeMembro = (id: string) => {
    const m = (membri ?? []).find((mm) => mm.id === id);
    return m ? m.full_name || m.email : null;
  };

  return (
    <>
      <div className="section-label" style={{ marginTop: 0 }}>Il tuo team</div>

      <div style={{ background: urgenti.length ? "#FEF3C7" : "var(--light-bg)", border: urgenti.length ? "1px solid #FDE68A" : "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: urgenti.length ? "#92400E" : "var(--gray-text)", marginBottom: urgenti.length ? 6 : 0 }}>
          {urgenti.length > 0 ? `⚠ ${urgenti.length} task urgenti (entro 2 giorni)` : "Nessun task urgente al momento"}
        </div>
        {urgenti.slice(0, 4).map((t) => (
          <div key={t.id} style={{ fontSize: 12.5, color: "#78350F" }}>{t.titolo}</div>
        ))}
        {urgenti.length === 0 && (
          <p style={{ fontSize: 11.5, color: "var(--gray-text)", fontStyle: "italic", margin: "4px 0 0" }}>
            Compare qui quando un task del reparto non completato ha una data puntata entro 2 giorni.
          </p>
        )}
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-text)", marginBottom: 8 }}>Chi è in diretta a breve</div>
        {direttePerReparto.length === 0 && (
          <p className="placeholder-note" style={{ marginTop: 0 }}>
            Nessuna diretta imminente con persone del reparto assegnate.
          </p>
        )}
        {direttePerReparto.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", background: "var(--light-bg)", borderRadius: 10, marginBottom: 6, fontSize: 12.5 }}>
            <span>
              {e.titolo}
              {(e.membri ?? []).length > 0 && (
                <span style={{ color: "var(--gray-text)" }}>
                  {" — "}
                  {(e.membri ?? []).map(nomeMembro).filter(Boolean).join(", ")}
                </span>
              )}
            </span>
            <span style={{ color: "var(--gray-text)" }}>
              {new Date(e.quando).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
            </span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-text)", marginBottom: 8 }}>Avanzamento per persona</div>
      {(membri ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro nel reparto ancora.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {(membri ?? []).map((m) => {
          const taskPersona = (taskReparto ?? []).filter((t) => t.assegnato_a === m.id);
          const completati = taskPersona.filter((t) => t.completato).length;
          const percentuale = taskPersona.length ? Math.round((completati / taskPersona.length) * 100) : 0;
          return (
            <div key={m.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{m.full_name || m.email}</span>
                <span style={{ color: "var(--gray-text)" }}>{completati}/{taskPersona.length} task</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "var(--light-bg)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${percentuale}%`, background: repartoColor(profile.reparto), borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
