import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const TIPO_LABEL: Record<string, string> = { diretta: "Diretta", riunione: "Riunione", altro: "Altro" };

export default async function IMieiScriptPage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.reparto !== "speaker") {
    return (
      <div className="card fade-in-up" style={{ maxWidth: 460 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>I miei script</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 13.5 }}>Questa sezione è per il reparto Speaker.</p>
      </div>
    );
  }

  const today = new Date();
  const [annoParam, meseParam] = (searchParams.mese ?? "").split("-").map(Number);
  const anno = annoParam || today.getFullYear();
  const mese = meseParam ? meseParam - 1 : today.getMonth();
  const inizioMese = new Date(anno, mese, 1);
  const fineMese = new Date(anno, mese + 1, 0, 23, 59, 59);

  const { data: tuttiEventi } = await supabase
    .from("events")
    .select("id, titolo, quando, tipo, membri")
    .in("tipo", ["diretta", "riunione"])
    .gte("quando", inizioMese.toISOString())
    .lte("quando", fineMese.toISOString())
    .order("quando", { ascending: false });

  const eventi = (tuttiEventi ?? []).filter((e) => (e.membri ?? []).includes(profile.id));
  const eventIds = eventi.map((e) => e.id);
  const { data: script } = eventIds.length
    ? await supabase.from("script_puntata").select("evento_id").in("evento_id", eventIds)
    : { data: [] as { evento_id: string }[] };
  const eventiConScript = new Set((script ?? []).map((s) => s.evento_id));

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  // Raggruppa per giorno, come nelle altre liste (Valutazioni/Qualità).
  const gruppi: { chiave: string; label: string; eventi: typeof eventi }[] = [];
  eventi.forEach((e) => {
    const d = new Date(e.quando);
    const chiave = d.toDateString();
    let g = gruppi.find((gr) => gr.chiave === chiave);
    if (!g) {
      g = { chiave, label: d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }), eventi: [] };
      gruppi.push(g);
    }
    g.eventi.push(e);
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>I miei script</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={`/dashboard/script?mese=${mesePrec}`} className="evt-pill">‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/script?mese=${meseSucc}`} className="evt-pill">›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Le tue dirette e riunioni del mese — scrivi o modifica lo script da qui.
      </p>

      <div className="card fade-in-up">
        {gruppi.length === 0 && (
          <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna puntata assegnata a te questo mese.</p>
        )}

        {gruppi.map((g) => (
          <div key={g.chiave}>
            <div className="val-day-label" style={{ textTransform: "capitalize" }}>{g.label}</div>
            {g.eventi.map((e) => {
              const haScript = eventiConScript.has(e.id);
              return (
                <div key={e.id} className="val-row" style={{ cursor: "default" }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="val-row-title">{e.titolo}</div>
                    <div className="val-row-meta">
                      {TIPO_LABEL[e.tipo]} · {new Date(e.quando).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexShrink: 0 }}>
                    {haScript && e.tipo === "diretta" && (
                      <Link href={`/dashboard/timer/${e.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--blue)" }}>
                        ⏱ Timer
                      </Link>
                    )}
                    <Link href={`/dashboard/script/${e.id}`} className="evt-pill evt-pill-on" style={{ textDecoration: "none" }}>
                      {haScript ? "Apri script" : "+ Crea script"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
