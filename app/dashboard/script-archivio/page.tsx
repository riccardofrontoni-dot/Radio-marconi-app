import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { repartoColor } from "@/lib/reparti";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const TIPO_LABEL: Record<string, string> = { diretta: "Diretta", riunione: "Riunione", altro: "Altro" };

export default async function ScriptArchivioPage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Script puntate</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è visibile solo al RAD.</p>
      </div>
    );
  }

  const today = new Date();
  const [annoParam, meseParam] = (searchParams.mese ?? "").split("-").map(Number);
  const anno = annoParam || today.getFullYear();
  const mese = meseParam ? meseParam - 1 : today.getMonth();
  const inizioMese = new Date(anno, mese, 1);
  const fineMese = new Date(anno, mese + 1, 0, 23, 59, 59);

  const { data: eventi } = await supabase
    .from("events")
    .select("id, titolo, quando, tipo, membri")
    .in("tipo", ["diretta", "riunione"])
    .gte("quando", inizioMese.toISOString())
    .lte("quando", fineMese.toISOString())
    .order("quando", { ascending: false });

  const eventIds = (eventi ?? []).map((e) => e.id);
  const { data: script } = eventIds.length
    ? await supabase.from("script_puntata").select("evento_id, titolo").in("evento_id", eventIds)
    : { data: [] as { evento_id: string; titolo: string | null }[] };

  const { data: membri } = await supabase.from("profiles").select("id, full_name, email, reparto");

  const scriptDi = (eventoId: string) => (script ?? []).find((s) => s.evento_id === eventoId);
  const nomeMembro = (id: string) => {
    const m = (membri ?? []).find((mm) => mm.id === id);
    return m ? { nome: m.full_name || m.email, colore: repartoColor(m.reparto) } : null;
  };

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  const gruppi: { chiave: string; label: string; eventi: typeof eventi }[] = [];
  (eventi ?? []).forEach((e) => {
    const d = new Date(e.quando);
    const chiave = d.toDateString();
    let g = gruppi.find((gr) => gr.chiave === chiave);
    if (!g) {
      g = { chiave, label: d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }), eventi: [] };
      gruppi.push(g);
    }
    g.eventi!.push(e);
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Script puntate</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/dashboard/script-archivio?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/script-archivio?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Archivio di tutti gli script scritti dagli speaker per dirette e riunioni.
      </p>

      {gruppi.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna diretta o riunione questo mese.</p>
      )}

      {gruppi.map((g) => (
        <div key={g.chiave} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-text)", textTransform: "capitalize", marginBottom: 8 }}>
            {g.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {g.eventi!.map((e) => {
              const s = scriptDi(e.id);
              return (
                <div
                  key={e.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    padding: "12px 16px", border: "1px solid var(--border)", borderRadius: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.titolo}</div>
                    <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span>{TIPO_LABEL[e.tipo]} · {new Date(e.quando).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
                      {(e.membri ?? []).map((id: string) => {
                        const m = nomeMembro(id);
                        if (!m) return null;
                        return (
                          <span key={id} style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: m.colore, borderRadius: 999, padding: "2px 8px" }}>
                            {m.nome}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    {s ? (
                      <>
                        <Link href={`/dashboard/script/${e.id}`} style={smallBtnStyle}>Apri script</Link>
                        <a href={`/api/script-pdf/${e.id}`} target="_blank" rel="noreferrer" style={{ ...smallBtnStyle, background: "var(--dark)", color: "#fff", borderColor: "var(--dark)" }}>
                          PDF
                        </a>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--gray-text)", fontStyle: "italic" }}>Nessuno script</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontSize: 16, color: "var(--dark)", padding: "3px 10px", borderRadius: 7, background: "var(--light-bg)",
};
const smallBtnStyle: React.CSSProperties = {
  fontSize: 11.5, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--white)", textDecoration: "none", color: "var(--dark)",
};
