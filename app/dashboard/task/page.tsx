import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTask, toggleTask, deleteTask } from "@/lib/actions";

const REPARTI = [
  { value: "speaker", label: "Speaker" },
  { value: "social", label: "Social media" },
  { value: "tecnico_video", label: "Tecnico video" },
  { value: "tecnico_audio", label: "Tecnico audio" },
  { value: "qualita", label: "Qualità" },
];

type Urgenza = "ritardo" | "urgente" | "tranquillo";

function classificaUrgenza(t: { completato: boolean; puntata_data: string | null }): Urgenza | null {
  if (t.completato) return null;
  if (!t.puntata_data) return "tranquillo";
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const scadenza = new Date(t.puntata_data);
  const traDueGiorni = new Date(oggi);
  traDueGiorni.setDate(oggi.getDate() + 2);
  if (scadenza < oggi) return "ritardo";
  if (scadenza <= traDueGiorni) return "urgente";
  return "tranquillo";
}

export default async function TaskPage({
  searchParams,
}: {
  searchParams: { filtro?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.ruolo === "rad") {
    return <VistaRad />;
  }

  if (profile.ruolo === "capo") {
    return <VistaCapo profile={profile} filtro={searchParams.filtro} />;
  }

  // Membro: solo le task assegnate a lui.
  const { data: tuttiTaskMiei } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto)
    .eq("assegnato_a", profile.id)
    .order("created_at", { ascending: true });

  const conteggiMiei = { ritardo: 0, urgente: 0, tranquillo: 0 };
  (tuttiTaskMiei ?? []).forEach((t) => {
    const u = classificaUrgenza(t);
    if (u) conteggiMiei[u]++;
  });

  const filtroMio = (searchParams.filtro as Urgenza | undefined) && ["ritardo", "urgente", "tranquillo"].includes(searchParams.filtro!)
    ? (searchParams.filtro as Urgenza)
    : null;
  const tasks = filtroMio
    ? (tuttiTaskMiei ?? []).filter((t) => classificaUrgenza(t) === filtroMio)
    : (tuttiTaskMiei ?? []);

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>Task reparto</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        <FiltroCard href="/dashboard/task" label="Tutte" valore={(tuttiTaskMiei ?? []).length} attivo={!filtroMio} colore="var(--dark)" />
        <FiltroCard href="/dashboard/task?filtro=ritardo" label="In ritardo" valore={conteggiMiei.ritardo} attivo={filtroMio === "ritardo"} colore="#DC2626" />
        <FiltroCard href="/dashboard/task?filtro=urgente" label="Urgente" valore={conteggiMiei.urgente} attivo={filtroMio === "urgente"} colore="#D97706" />
        <FiltroCard href="/dashboard/task?filtro=tranquillo" label="Tranquilla" valore={conteggiMiei.tranquillo} attivo={filtroMio === "tranquillo"} colore="var(--blue)" />
      </div>

      <div className="section-label" style={{ marginTop: 0 }}>Le tue task</div>

      {(tasks ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>
          {filtroMio ? "Nessun task in questa categoria." : "Nessun task ancora assegnato a te."}
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
              {t.puntata_data && (
                <span style={{ color: "var(--gray-text)" }}>
                  {" — "}{new Date(t.puntata_data).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                </span>
              )}
            </span>
          </button>
        </form>
      ))}
      <p className="placeholder-note">Clicca un task per segnarlo completato.</p>
    </div>
  );
}

// Capo reparto: squadra, assegnazione e avanzamento — stesso contenuto che prima stava in "Gestione reparto".
async function VistaCapo({ profile, filtro }: { profile: { id: string; reparto: string }; filtro?: string }) {
  const supabase = createClient();

  const { data: membri } = await supabase
    .from("profiles")
    .select("*")
    .eq("reparto", profile.reparto)
    .eq("status", "attivo")
    .order("full_name");

  const { data: tuttiTask } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto)
    .order("created_at", { ascending: true });

  const conteggi = { ritardo: 0, urgente: 0, tranquillo: 0 };
  (tuttiTask ?? []).forEach((t) => {
    const u = classificaUrgenza(t);
    if (u) conteggi[u]++;
  });

  const filtroAttivo = (filtro as Urgenza | undefined) && ["ritardo", "urgente", "tranquillo"].includes(filtro!) ? (filtro as Urgenza) : null;
  const tasks = filtroAttivo
    ? (tuttiTask ?? []).filter((t) => classificaUrgenza(t) === filtroAttivo)
    : (tuttiTask ?? []);

  const taskSenzaAssegnazione = tasks.filter((t) => !t.assegnato_a);

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Task reparto</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 20 }}>
        Assegna task ai membri del tuo reparto e tieni traccia dell'avanzamento.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
        <FiltroCard href="/dashboard/task" label="Tutti" valore={(tuttiTask ?? []).length} attivo={!filtroAttivo} colore="var(--dark)" />
        <FiltroCard href="/dashboard/task?filtro=ritardo" label="In ritardo" valore={conteggi.ritardo} attivo={filtroAttivo === "ritardo"} colore="#DC2626" />
        <FiltroCard href="/dashboard/task?filtro=urgente" label="Urgente" valore={conteggi.urgente} attivo={filtroAttivo === "urgente"} colore="#D97706" />
        <FiltroCard href="/dashboard/task?filtro=tranquillo" label="Tranquillo" valore={conteggi.tranquillo} attivo={filtroAttivo === "tranquillo"} colore="var(--blue)" />
      </div>

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
          <label style={labelStyle}>Data</label>
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
          const taskPersona = tasks.filter((t) => t.assegnato_a === m.id);
          if (filtroAttivo && taskPersona.length === 0) return null;
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
                  {m.id === profile.id && (
                    <form action={async () => { "use server"; await deleteTask(t.id); }}>
                      <button type="submit" style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>
                        Elimina
                      </button>
                    </form>
                  )}
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

function FiltroCard({ href, label, valore, attivo, colore }: { href: string; label: string; valore: number; attivo: boolean; colore: string }) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        display: "block", textDecoration: "none",
        border: attivo ? `1.5px solid ${colore}` : "1px solid var(--border)",
        background: attivo ? `${colore}0F` : "var(--white)",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", color: colore }}>{valore}</div>
      <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2 }}>{label}</div>
    </Link>
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

const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)",
  fontSize: 12.5, fontFamily: "inherit", background: "var(--white)",
};
