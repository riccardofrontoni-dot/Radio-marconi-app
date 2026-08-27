import { createClient } from "@/lib/supabase/server";
import { toggleTask } from "@/lib/actions";

const REPARTI = [
  { value: "speaker", label: "Speaker" },
  { value: "social", label: "Social media" },
  { value: "tecnico_video", label: "Tecnico video" },
  { value: "tecnico_audio", label: "Tecnico audio" },
  { value: "qualita", label: "Qualità" },
];

export default async function TaskPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.ruolo === "rad") {
    return <VistaRad />;
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto)
    .order("created_at", { ascending: true });

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>Task reparto</h2>
      <div className="section-label" style={{ marginTop: 0 }}>Task del tuo reparto</div>

      {(tasks ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun task ancora creato per questo reparto.</p>
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
              marginBottom: 8, fontSize: 13.5, background: "var(--white)",
            }}
          >
            <span
              style={{
                width: 18, height: 18, borderRadius: "50%", marginRight: 12, flexShrink: 0,
                border: t.completato ? "none" : "1.5px solid var(--border)",
                background: t.completato ? "var(--blue)" : "transparent",
              }}
            />
            <span style={{ textDecoration: t.completato ? "line-through" : "none", color: t.completato ? "#a1a1a6" : "var(--dark)" }}>
              {t.titolo}
            </span>
          </button>
        </form>
      ))}
      <p className="placeholder-note">Clicca un task per segnarlo completato — è già collegato al database.</p>
    </div>
  );
}

async function VistaRad() {
  const supabase = createClient();

  const { data: membri } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "attivo")
    .order("full_name");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Task — tutti i reparti</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Vista completa: ogni reparto, chi ne fa parte, e i task assegnati a ciascuno dai capi reparto.
      </p>

      {REPARTI.map((r) => {
        const membriReparto = (membri ?? []).filter((m) => m.reparto === r.value);
        const taskReparto = (tasks ?? []).filter((t) => t.reparto === r.value);
        const nonAssegnati = taskReparto.filter((t) => !t.assegnato_a);

        return (
          <div key={r.value} style={{ marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <h3 style={{ fontSize: 16 }}>{r.label}</h3>
              <span style={{ fontSize: 12, color: "var(--gray-text)" }}>
                {membriReparto.length} {membriReparto.length === 1 ? "persona" : "persone"} · {taskReparto.length} task
              </span>
            </div>

            {membriReparto.length === 0 && (
              <p className="placeholder-note" style={{ marginTop: 0, marginBottom: 10 }}>Nessun membro assegnato a questo reparto.</p>
            )}

            {membriReparto.map((m) => {
              const taskPersona = taskReparto.filter((t) => t.assegnato_a === m.id);
              return (
                <div key={m.id} style={{ background: "var(--light-bg)", borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: taskPersona.length ? 8 : 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.full_name || m.email}</span>
                    {m.ruolo === "capo" && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", background: "#E5F4EA", borderRadius: 999, padding: "2px 8px" }}>
                        Capo reparto
                      </span>
                    )}
                  </div>

                  {taskPersona.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--gray-text)", margin: 0 }}>Nessun task assegnato.</p>
                  ) : (
                    taskPersona.map((t) => (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12.5 }}>
                        <span
                          style={{
                            width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                            border: t.completato ? "none" : "1.5px solid var(--border)",
                            background: t.completato ? "var(--blue)" : "transparent",
                          }}
                        />
                        <span style={{ textDecoration: t.completato ? "line-through" : "none", color: t.completato ? "#a1a1a6" : "var(--dark)" }}>
                          {t.titolo}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}

            {nonAssegnati.length > 0 && (
              <div style={{ border: "1px dashed var(--border)", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-text)", marginBottom: 6 }}>Non assegnati a nessuno</div>
                {nonAssegnati.map((t) => (
                  <div key={t.id} style={{ fontSize: 12.5, color: "var(--dark)", padding: "3px 0" }}>{t.titolo}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
