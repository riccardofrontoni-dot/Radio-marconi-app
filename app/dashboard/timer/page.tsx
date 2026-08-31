import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default async function IMieiTimerPage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.reparto !== "speaker") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Timer diretta</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è per il reparto Speaker.</p>
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
    .select("id, titolo, quando, membri")
    .eq("tipo", "diretta")
    .gte("quando", inizioMese.toISOString())
    .lte("quando", fineMese.toISOString())
    .order("quando", { ascending: false });

  const eventi = (tuttiEventi ?? []).filter((e) => (e.membri ?? []).includes(profile.id));
  const eventIds = eventi.map((e) => e.id);

  const { data: script } = eventIds.length
    ? await supabase.from("script_puntata").select("evento_id").in("evento_id", eventIds)
    : { data: [] as { evento_id: string }[] };
  const eventiConScript = new Set((script ?? []).map((s) => s.evento_id));

  const { data: sessioni } = eventIds.length
    ? await supabase.from("timer_sessioni").select("evento_id, precisione").eq("membro_id", profile.id).in("evento_id", eventIds)
    : { data: [] as { evento_id: string; precisione: number }[] };
  const precisioneDi = (id: string) => (sessioni ?? []).find((s) => s.evento_id === id)?.precisione;

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Timer diretta</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/dashboard/timer?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/timer?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Le tue dirette del mese — cronometra i blocchi rispetto ai tempi dello script.
      </p>

      {eventi.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna diretta assegnata a te questo mese.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {eventi.map((e) => {
          const haScript = eventiConScript.has(e.id);
          const precisione = precisioneDi(e.id);
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.titolo}</div>
                <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 2 }}>
                  {new Date(e.quando).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                  {precisione !== undefined && <span style={{ color: "var(--blue)", fontWeight: 600 }}> · {precisione}% precisione</span>}
                </div>
              </div>
              {haScript ? (
                <Link href={`/dashboard/timer/${e.id}`} className="btn-primary" style={{ fontSize: 12, padding: "8px 14px", textDecoration: "none" }}>
                  {precisione !== undefined ? "Rifai timer" : "Avvia timer"}
                </Link>
              ) : (
                <Link href={`/dashboard/script/${e.id}`} style={{ fontSize: 12, color: "var(--gray-text)" }}>
                  Serve prima lo script
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontSize: 16, color: "var(--dark)", padding: "3px 10px", borderRadius: 7, background: "var(--light-bg)",
};
