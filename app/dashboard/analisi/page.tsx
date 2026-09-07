import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import { REPARTI, repartoColor, repartoLabel } from "@/lib/reparti";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default async function AnalisiPage({
  searchParams,
}: {
  searchParams: { mese?: string; reparto?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "rad" && profile.ruolo !== "professore") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Analisi</h2>
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

  const repartoFiltro = searchParams.reparto ?? "";

  // Eventi (dirette/riunioni) del mese, con le persone coinvolte.
  const { data: eventi } = await supabase
    .from("events")
    .select("id, titolo, quando, tipo, membri")
    .gte("quando", inizioMese.toISOString())
    .lte("quando", fineMese.toISOString());

  const eventIds = (eventi ?? []).map((e) => e.id);

  // Voti individuali (attitudine, professionalità, performance) collegati a quelle dirette.
  const { data: voti } = eventIds.length
    ? await supabase.from("voti_membri").select("evento_id, membro_id, attitudine, professionalita, performance").in("evento_id", eventIds)
    : { data: [] as { evento_id: string; membro_id: string; attitudine: number; professionalita: number; performance: number }[] };

  // Conteggio dirette e voti per membro (media dei tre parametri, su tutti i voti ricevuti nel mese).
  const direttePerMembro: Record<string, number> = {};
  (eventi ?? []).forEach((e) => {
    (e.membri ?? []).forEach((mid: string) => {
      direttePerMembro[mid] = (direttePerMembro[mid] ?? 0) + 1;
    });
  });

  const votiPerMembro: Record<string, number[]> = {};
  (voti ?? []).forEach((v) => {
    const media = (v.attitudine + v.professionalita + v.performance) / 3;
    (votiPerMembro[v.membro_id] ??= []).push(media);
  });

  // Precisione del timer (quanto gli speaker rispettano i tempi in diretta).
  const { data: sessioniTimer } = eventIds.length
    ? await supabase.from("timer_sessioni").select("evento_id, membro_id, precisione").in("evento_id", eventIds)
    : { data: [] as { evento_id: string; membro_id: string; precisione: number }[] };

  const precisionePerMembro: Record<string, number[]> = {};
  (sessioniTimer ?? []).forEach((s) => {
    (precisionePerMembro[s.membro_id] ??= []).push(s.precisione);
  });

  // Presenze alle riunioni del sabato.
  const riunioniIds = (eventi ?? []).filter((e) => e.tipo === "riunione").map((e) => e.id);
  const { data: presenzeRiunioni } = riunioniIds.length
    ? await supabase.from("presenze_riunioni").select("evento_id, membro_id, presente").in("evento_id", riunioniIds)
    : { data: [] as { evento_id: string; membro_id: string; presente: boolean }[] };

  const riunioniAssegnatePerMembro: Record<string, number> = {};
  (eventi ?? []).forEach((e) => {
    if (e.tipo !== "riunione") return;
    (e.membri ?? []).forEach((mid: string) => {
      riunioniAssegnatePerMembro[mid] = (riunioniAssegnatePerMembro[mid] ?? 0) + 1;
    });
  });
  const presentiPerMembro: Record<string, number> = {};
  (presenzeRiunioni ?? []).forEach((p) => {
    if (p.presente) presentiPerMembro[p.membro_id] = (presentiPerMembro[p.membro_id] ?? 0) + 1;
  });

  // Membri attivi, filtrati per reparto se richiesto. I Professori non fanno
  // dirette e non vengono valutati, quindi non compaiono in questo elenco.
  let query = supabase.from("profiles").select("*").eq("status", "attivo").neq("ruolo", "professore");
  if (repartoFiltro) query = query.eq("reparto", repartoFiltro);
  const { data: membri } = await query;

  const righe = (membri ?? [])
    .map((m) => {
      const dirette = direttePerMembro[m.id] ?? 0;
      const voti = votiPerMembro[m.id] ?? [];
      const votoMedio = voti.length ? voti.reduce((a, b) => a + b, 0) / voti.length : null;
      const precisioni = precisionePerMembro[m.id] ?? [];
      const puntualita = precisioni.length ? Math.round(precisioni.reduce((a, b) => a + b, 0) / precisioni.length) : null;
      const riunioniAssegnate = riunioniAssegnatePerMembro[m.id] ?? 0;
      const presenzaRiunioni = riunioniAssegnate ? Math.round(((presentiPerMembro[m.id] ?? 0) / riunioniAssegnate) * 100) : null;
      return { ...m, dirette, votoMedio, votiCount: voti.length, puntualita, riunioniAssegnate, presenzaRiunioni };
    })
    .sort((a, b) => b.dirette - a.dirette);

  const meseKey = (a: number, mm: number) => `${a}-${String(mm + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);
  const qs = (nuovoReparto: string) => `mese=${meseKey(anno, mese)}${nuovoReparto ? `&reparto=${nuovoReparto}` : ""}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Analisi membri</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/dashboard/analisi?mese=${mesePrec}${repartoFiltro ? `&reparto=${repartoFiltro}` : ""}`} style={navBtnStyle}>‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/analisi?mese=${meseSucc}${repartoFiltro ? `&reparto=${repartoFiltro}` : ""}`} style={navBtnStyle}>›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 20 }}>
        Dirette fatte e voto medio ricevuto, per organizzare premi settimanali o mensili.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        <Link href={`/dashboard/analisi?${qs("")}`} style={pillStyle(!repartoFiltro, "#1D1D1F")}>Tutti</Link>
        {REPARTI.map((r) => (
          <Link key={r.value} href={`/dashboard/analisi?${qs(r.value)}`} style={pillStyle(repartoFiltro === r.value, r.color)}>
            {r.label}
          </Link>
        ))}
      </div>

      {righe.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun membro trovato per questo filtro.</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 }}>
        {righe.map((m) => {
          const iniziali = (m.full_name || m.email).split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
          const stats = [
            { label: "dirette", valore: String(m.dirette) },
            { label: "voto medio", valore: m.votoMedio !== null ? m.votoMedio.toFixed(1) : "—" },
            ...(m.reparto === "speaker" ? [{ label: "puntualità", valore: m.puntualita !== null ? `${m.puntualita}%` : "—" }] : []),
            ...(m.riunioniAssegnate > 0 ? [{ label: "presenze riunioni", valore: m.presenzaRiunioni !== null ? `${m.presenzaRiunioni}%` : "—" }] : []),
          ];
          return (
            <div key={m.id} className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 16px" }}>
              {m.avatar_url ? (
                <img
                  src={m.avatar_url}
                  alt=""
                  width={56}
                  height={56}
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", marginBottom: 10 }}
                />
              ) : (
                <div
                  style={{
                    width: 56, height: 56, borderRadius: "50%", marginBottom: 10,
                    background: m.reparto ? repartoColor(m.reparto) : "var(--light-bg)",
                    color: m.reparto ? "#fff" : "var(--gray-text)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17,
                  }}
                >
                  {iniziali}
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                {m.full_name || m.email}
              </div>
              <div style={{ fontSize: 11, color: "var(--gray-text)", marginBottom: 16 }}>{repartoLabel(m.reparto)}</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px 10px", width: "100%", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                {stats.map((s) => (
                  <div key={s.label}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Georgia, serif" }}>{s.valore}</div>
                    <div style={{ fontSize: 9.5, color: "var(--gray-text)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
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

function pillStyle(attivo: boolean, colore: string): React.CSSProperties {
  return {
    fontSize: 12.5, fontWeight: 600, padding: "6px 14px", borderRadius: 999,
    background: attivo ? colore : "var(--light-bg)",
    color: attivo ? "#fff" : "var(--gray-text)",
    border: attivo ? "none" : "1px solid var(--border)",
  };
}
