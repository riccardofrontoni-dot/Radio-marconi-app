import { createClient } from "@/lib/supabase/server";
import { REPARTI, repartoColor } from "@/lib/reparti";
import RepartoSelect from "./reparto-select";

export default async function MembriPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Membri</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è visibile solo al RAD.</p>
      </div>
    );
  }

  const { data: membri } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "attivo")
    .order("full_name");

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Membri</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 26 }}>
        Tutti gli studenti attivi. Cambia il reparto quando vuoi — si aggiorna anche sul calendario.
      </p>

      {(membri ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro attivo ancora.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(membri ?? []).map((m) => {
          const initials = (m.full_name || m.email).split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
          return (
            <div
              key={m.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: m.reparto ? repartoColor(m.reparto) : "var(--light-bg)",
                    color: m.reparto ? "#fff" : "var(--gray-text)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 12.5,
                  }}
                >
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.full_name || m.email}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-text)", display: "flex", alignItems: "center", gap: 6 }}>
                    {m.email}
                    {m.ruolo === "capo" && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", background: "#E5F4EA", borderRadius: 999, padding: "1px 7px" }}>
                        Capo reparto
                      </span>
                    )}
                    {m.ruolo === "rad" && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#7C3AED", background: "#F1EBFE", borderRadius: 999, padding: "1px 7px" }}>
                        RAD
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <RepartoSelect profileId={m.id} repartoAttuale={m.reparto} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
