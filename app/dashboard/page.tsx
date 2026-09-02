import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import { REPARTI, repartoColor, repartoLabel } from "@/lib/reparti";
import { segnaAvvisoLetto, toggleTask } from "@/lib/actions";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  const inizioOggi = new Date();
  inizioOggi.setHours(0, 0, 0, 0);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto)
    .order("created_at", { ascending: true });

  const { data: nextEvent } = await supabase
    .from("events")
    .select("*")
    .gte("quando", inizioOggi.toISOString())
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

      <AvvisiBanner destinatarioId={profile.id} />
      {profile.ruolo === "rad" && <ResocontiInAttesaBanner />}

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

      <PromemoriaDirette reparto={profile.reparto} userId={profile.id} />

      {isCapo && <TeamOverview profile={profile} />}

      <PanoramicaReparti repartoAttuale={profile.reparto} />

      <div className="section-label">Il tuo processo</div>
      {(tasks ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>
          Nessun task ancora assegnato al tuo reparto.
        </p>
      )}
      {(tasks ?? []).map((t) => (
        <form
          key={t.id}
          action={async () => {
            "use server";
            await toggleTask(t.id, t.completato);
          }}
        >
          <button
            type="submit"
            style={{
              display: "flex", alignItems: "center", width: "100%", textAlign: "left",
              padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10,
              marginBottom: 8, fontSize: 13.5, background: "var(--white)", fontFamily: "inherit",
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
          </button>
        </form>
      ))}
    </div>
  );
}

// Promemoria delle prossime dirette/riunioni del reparto — visibile a tutti.
async function PromemoriaDirette({ reparto, userId }: { reparto: string; userId: string }) {
  const supabase = createClient();

  const { data: membriReparto } = await supabase
    .from("profiles")
    .select("id")
    .eq("reparto", reparto)
    .eq("status", "attivo");
  const membriIds = new Set((membriReparto ?? []).map((m) => m.id));

  const inizioOggi = new Date();
  inizioOggi.setHours(0, 0, 0, 0);

  const { data: prossimi } = await supabase
    .from("events")
    .select("id, titolo, quando, tipo, membri")
    .gte("quando", inizioOggi.toISOString())
    .order("quando", { ascending: true })
    .limit(15);

  const rilevanti = (prossimi ?? [])
    .filter((e) => (e.membri ?? []).some((mid: string) => membriIds.has(mid)))
    .slice(0, 3);

  if (rilevanti.length === 0) return null;

  const eventIds = rilevanti.map((e) => e.id);
  const { data: scriptEsistenti } = eventIds.length
    ? await supabase.from("script_puntata").select("evento_id").in("evento_id", eventIds)
    : { data: [] as { evento_id: string }[] };
  const eventiConScript = new Set((scriptEsistenti ?? []).map((s) => s.evento_id));

  return (
    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1E40AF", marginBottom: 8 }}>📅 Dirette in arrivo per il tuo reparto</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rilevanti.map((e) => {
          const seiCoinvolto = (e.membri ?? []).includes(userId);
          const serveScript = reparto === "speaker" && seiCoinvolto && !eventiConScript.has(e.id);
          return (
            <div key={e.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#1E3A8A" }}>
                <span>{e.titolo}{seiCoinvolto ? " — ci sei tu!" : ""}</span>
                <span>{new Date(e.quando).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}</span>
              </div>
              {serveScript && (
                <a href={`/dashboard/script/${e.id}`} style={{ fontSize: 11.5, fontWeight: 700, color: "#B45309" }}>
                  ⚠ Manca ancora lo script — scrivilo ora →
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Confronto tra reparti sulla percentuale di task completati — competizione sana.
async function PanoramicaReparti({ repartoAttuale }: { repartoAttuale: string }) {
  const supabase = createClient();
  const { data: tuttiTask } = await supabase.from("tasks").select("reparto, completato");

  const righe = REPARTI.map((r) => {
    const task = (tuttiTask ?? []).filter((t) => t.reparto === r.value);
    const completati = task.filter((t) => t.completato).length;
    const percentuale = task.length ? Math.round((completati / task.length) * 100) : 0;
    return { ...r, percentuale, totale: task.length };
  }).sort((a, b) => b.percentuale - a.percentuale);

  return (
    <>
      <div className="section-label" style={{ marginTop: 0 }}>Come vanno i reparti</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
        {righe.map((r, i) => {
          const isMio = r.value === repartoAttuale;
          return (
            <div
              key={r.value}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                border: isMio ? `1.5px solid ${r.color}` : "1px solid var(--border)",
                background: isMio ? `${r.color}12` : "var(--white)",
                borderRadius: 10,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-text)", width: 16 }}>{i + 1}</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, fontWeight: isMio ? 700 : 500, flex: 1 }}>
                {r.label}{isMio ? " (il tuo)" : ""}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--gray-text)" }}>{r.totale === 0 ? "—" : `${r.percentuale}%`}</span>
            </div>
          );
        })}
      </div>
    </>
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
            Compare qui quando un task del reparto non completato ha una data entro 2 giorni.
          </p>
        )}
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

// Avvisi non letti mandati dal capo reparto — visibili a chiunque li riceva.
async function AvvisiBanner({ destinatarioId }: { destinatarioId: string }) {
  const supabase = createClient();
  const { data: avvisi } = await supabase
    .from("avvisi")
    .select("*")
    .eq("destinatario_id", destinatarioId)
    .eq("letto", false)
    .order("creato_il", { ascending: false });

  if (!avvisi || avvisi.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
      {avvisi.map((a) => (
        <div key={a.id} style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16 }}>📣</span>
          <span style={{ fontSize: 13, color: "#78350F", flex: 1 }}>{a.testo}</span>
          <form action={async () => { "use server"; await segnaAvvisoLetto(a.id); }}>
            <button type="submit" style={{ border: "none", background: "rgba(146,64,14,0.12)", color: "#92400E", borderRadius: 7, padding: "4px 10px", fontSize: 11.5, cursor: "pointer", fontWeight: 600 }}>
              Segna come letto
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}

// Resoconti qualità in attesa di approvazione — visibile solo al RAD.
async function ResocontiInAttesaBanner() {
  const supabase = createClient();
  const { count } = await supabase
    .from("quality_reports")
    .select("id", { count: "exact", head: true })
    .eq("stato", "in_revisione");

  if (!count || count === 0) return null;

  return (
    <a
      href="/dashboard/resoconti"
      style={{
        display: "flex", alignItems: "center", gap: 12, textDecoration: "none",
        background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 12, padding: "12px 16px", marginBottom: 20,
      }}
    >
      <span style={{ fontSize: 16 }}>🔴</span>
      <span style={{ fontSize: 13, color: "#991B1B", flex: 1 }}>
        {count} {count === 1 ? "resoconto in attesa" : "resoconti in attesa"} di approvazione
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#991B1B" }}>Vai a Resoconti →</span>
    </a>
  );
}
