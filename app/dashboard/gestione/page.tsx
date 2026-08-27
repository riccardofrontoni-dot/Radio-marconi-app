import { createClient } from "@/lib/supabase/server";
import { createTask, toggleTask, deleteTask } from "@/lib/actions";

export default async function GestionePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const { data: membri } = await supabase
    .from("profiles")
    .select("*")
    .eq("reparto", profile.reparto)
    .eq("status", "attivo")
    .order("full_name");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto)
    .order("created_at", { ascending: true });

  const taskSenzaAssegnazione = (tasks ?? []).filter((t) => !t.assegnato_a);

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Gestione reparto</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Assegna task ai membri del tuo reparto e tieni traccia dell'avanzamento.
      </p>

      <div className="section-label" style={{ marginTop: 0 }}>Nuovo task</div>
      <form
        action={createTask}
        style={{ background: "var(--light-bg)", borderRadius: 14, padding: 16, display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr auto", gap: 10, alignItems: "end", marginBottom: 28 }}
      >
        <div>
          <label style={labelStyle}>Titolo</label>
          <input name="titolo" type="text" required placeholder="Es. Scaletta puntata di giovedì" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Assegna a</label>
          <select name="assegnato_a" style={inputStyle} defaultValue="">
            <option value="">Nessuno in particolare</option>
            {(membri ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Data puntata</label>
          <input name="puntata_data" type="date" style={inputStyle} />
        </div>
        <button type="submit" className="btn-primary" style={{ fontSize: 13 }}>Assegna</button>
      </form>

      <div className="section-label" style={{ marginTop: 0 }}>Membri del reparto</div>
      {(membri ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro nel reparto ancora.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {(membri ?? []).map((m) => {
          const taskPersona = (tasks ?? []).filter((t) => t.assegnato_a === m.id);
          return (
            <div key={m.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: taskPersona.length ? 10 : 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.full_name || m.email}</span>
                {m.ruolo === "capo" && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", background: "#E5F4EA", borderRadius: 999, padding: "1px 7px" }}>
                    Capo reparto
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--gray-text)", marginLeft: "auto" }}>
                  {taskPersona.filter((t) => t.completato).length}/{taskPersona.length} completati
                </span>
              </div>

              {taskPersona.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <form action={async () => { "use server"; await toggleTask(t.id, t.completato); }}>
                    <button
                      type="submit"
                      style={{
                        width: 16, height: 16, borderRadius: "50%", border: t.completato ? "none" : "1.5px solid var(--border)",
                        background: t.completato ? "var(--blue)" : "transparent", cursor: "pointer", padding: 0,
                      }}
                    />
                  </form>
                  <span style={{ fontSize: 12.5, flex: 1, textDecoration: t.completato ? "line-through" : "none", color: t.completato ? "#a1a1a6" : "var(--dark)" }}>
                    {t.titolo}
                    {t.puntata_data && (
                      <span style={{ color: "var(--gray-text)" }}>
                        {" — "}{new Date(t.puntata_data).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </span>
                  <form action={async () => { "use server"; await deleteTask(t.id); }}>
                    <button type="submit" style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                      Elimina
                    </button>
                  </form>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {taskSenzaAssegnazione.length > 0 && (
        <>
          <div className="section-label">Task senza persona assegnata</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {taskSenzaAssegnazione.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px dashed var(--border)", borderRadius: 10 }}>
                <form action={async () => { "use server"; await toggleTask(t.id, t.completato); }}>
                  <button
                    type="submit"
                    style={{
                      width: 16, height: 16, borderRadius: "50%", border: t.completato ? "none" : "1.5px solid var(--border)",
                      background: t.completato ? "var(--blue)" : "transparent", cursor: "pointer", padding: 0,
                    }}
                  />
                </form>
                <span style={{ fontSize: 12.5, flex: 1, textDecoration: t.completato ? "line-through" : "none", color: t.completato ? "#a1a1a6" : "var(--dark)" }}>
                  {t.titolo}
                </span>
                <form action={async () => { "use server"; await deleteTask(t.id); }}>
                  <button type="submit" style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                    Elimina
                  </button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)",
  fontSize: 12.5, fontFamily: "inherit", background: "var(--white)",
};
