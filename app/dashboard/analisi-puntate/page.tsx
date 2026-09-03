import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default async function AnalisiPuntatePage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "rad" && profile.reparto !== "qualita" && profile.ruolo !== "professore") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Analisi puntate</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è per il RAD e il reparto Qualità.</p>
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
    .select("id, titolo, quando, membri")
    .eq("tipo", "diretta")
    .gte("quando", inizioMese.toISOString())
    .lte("quando", fineMese.toISOString())
    .order("quando", { ascending: false });

  const eventIds = (eventi ?? []).map((e) => e.id);
  const { data: voti } = eventIds.length
    ? await supabase.from("voti_membri").select("evento_id, attitudine, professionalita, performance").in("evento_id", eventIds)
    : { data: [] as { evento_id: string; attitudine: number; professionalita: number; performance: number }[] };

  const { data: membri } = await supabase.from("profiles").select("id, full_name, email");
  const nomeMembro = (id: string) => {
    const m = (membri ?? []).find((mm) => mm.id === id);
    return m ? (m.full_name || m.email) : "";
  };

  const puntate = (eventi ?? []).map((e) => {
    const votiEvento = (voti ?? []).filter((v) => v.evento_id === e.id);
    const punteggio = votiEvento.length
      ? votiEvento.reduce((a, v) => a + (v.attitudine + v.professionalita + v.performance) / 3, 0) / votiEvento.length
      : null;
    return {
      ...e,
      punteggio,
      numVotati: votiEvento.length,
      numCoinvolti: (e.membri ?? []).length,
    };
  });

  const conVoto = puntate.filter((p) => p.punteggio !== null).sort((a, b) => (b.punteggio! - a.punteggio!));
  const senzaVoto = puntate.filter((p) => p.punteggio === null);
  const migliore = conVoto[0];

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Analisi puntate</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/dashboard/analisi-puntate?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/analisi-puntate?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Le dirette del mese ordinate per punteggio medio (media dei voti individuali dati a chi era presente).
      </p>

      {migliore && (
        <div style={{ background: "linear-gradient(135deg, #1F5C33, #3E9D5C)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, color: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.85, marginBottom: 6 }}>
            🏆 Migliore diretta del mese
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif", marginBottom: 4 }}>{migliore.titolo}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {new Date(migliore.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            {" · "}punteggio {migliore.punteggio!.toFixed(1)} / 5
          </div>
        </div>
      )}

      {puntate.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna diretta questo mese.</p>
      )}

      {conVoto.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: senzaVoto.length ? 24 : 0 }}>
          {conVoto.map((p, i) => (
            <Link
              key={p.id}
              href={`/dashboard/calendario?mese=${meseKey(new Date(p.quando).getFullYear(), new Date(p.quando).getMonth())}`}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                border: i === 0 ? "1.5px solid var(--blue)" : "1px solid var(--border)",
                borderRadius: 12, textDecoration: "none", color: "inherit",
                background: i === 0 ? "#EAF6EE" : "var(--white)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-text)", width: 20 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.titolo}</div>
                <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 2 }}>
                  {new Date(p.quando).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                  {" · "}{p.numVotati}/{p.numCoinvolti} valutati
                  {p.membri && p.membri.length > 0 && " · " + p.membri.map(nomeMembro).filter(Boolean).join(", ")}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif", color: "var(--blue)" }}>
                {p.punteggio!.toFixed(1)}
              </div>
            </Link>
          ))}
        </div>
      )}

      {senzaVoto.length > 0 && (
        <>
          <div className="section-label">Non ancora valutate</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {senzaVoto.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: "1px dashed var(--border)", borderRadius: 10, fontSize: 12.5, color: "var(--gray-text)" }}>
                <span>{p.titolo}</span>
                <span>{new Date(p.quando).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontSize: 16, color: "var(--dark)", padding: "3px 10px", borderRadius: 7, background: "var(--light-bg)",
};
