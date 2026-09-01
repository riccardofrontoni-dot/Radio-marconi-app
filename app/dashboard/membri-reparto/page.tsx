import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import { createTask, inviaAvviso, toggleTask, deleteTask } from "@/lib/actions";

export default async function MembriRepartoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "capo") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Membri del reparto</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è per i capi reparto.</p>
      </div>
    );
  }

  const { data: membri } = await supabase
    .from("profiles")
    .select("*")
    .eq("reparto", profile.reparto)
    .eq("status", "attivo")
    .order("full_name");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto);

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Membri del reparto</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        La tua squadra — assegna task e manda avvisi diretti a ciascuno.
      </p>

      {(membri ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro nel reparto ancora.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(membri ?? []).map((m) => {
          const taskPersona = (tasks ?? []).filter((t) => t.assegnato_a === m.id);
          const completati = taskPersona.filter((t) => t.completato).length;

          return (
            <div key={m.id} className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#E5F4EA", color: "#1F5C33", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5 }}>
                  {(m.full_name || m.email).split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.full_name || m.email}</div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-text)" }}>{m.email}</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--gray-text)" }}>
                  {completati}/{taskPersona.length} task completati
                </div>
              </div>

              {taskPersona.length > 0 && (
                <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                  {taskPersona.map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <form action={async () => { "use server"; await toggleTask(t.id, t.completato); }}>
                        <button
                          type="submit"
                          style={{
                            width: 15, height: 15, borderRadius: "50%", border: t.completato ? "none" : "1.5px solid var(--border)",
                            background: t.completato ? "var(--blue)" : "transparent", cursor: "pointer", padding: 0,
                          }}
                        />
                      </form>
                      <span style={{ flex: 1, textDecoration: t.completato ? "line-through" : "none", color: t.completato ? "#a1a1a6" : "var(--dark)" }}>
                        {t.titolo}
                      </span>
                      <form action={async () => { "use server"; await deleteTask(t.id); }}>
                        <button type="submit" style={{ border: "none", background: "none", color: "#c22", fontSize: 11, cursor: "pointer" }}>Elimina</button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <form action={createTask} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="assegnato_a" value={m.id} />
                  <input
                    name="titolo"
                    type="text"
                    required
                    placeholder="Nuova task per lui/lei"
                    style={{ flex: 1, padding: "7px 9px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12, fontFamily: "inherit" }}
                  />
                  <button type="submit" className="btn-primary" style={{ fontSize: 11.5, padding: "7px 12px" }}>Assegna</button>
                </form>

                <form action={inviaAvviso.bind(null, m.id)} style={{ display: "flex", gap: 6 }}>
                  <input
                    name="testo"
                    type="text"
                    required
                    placeholder="Manda un avviso"
                    style={{ flex: 1, padding: "7px 9px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12, fontFamily: "inherit" }}
                  />
                  <button type="submit" className="btn-primary" style={{ fontSize: 11.5, padding: "7px 12px", background: "var(--blue)" }}>Invia</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
