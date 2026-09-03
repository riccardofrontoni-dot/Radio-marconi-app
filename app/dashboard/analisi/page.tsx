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

  // Membri attivi, filtrati per reparto se richiesto.
  let query = supabase.from("profiles").select("*").eq("status", "attivo");
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

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {righe.map((m, i) => (
          <div
            key={m.id}
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
              border: "1px solid var(--border)", borderRadius: 12,
            }}
          >
            <div style={{ width: 22, fontSize: 13, fontWeight: 700, color: "var(--gray-text)", textAlign: "center" }}>
              {i + 1}
            </div>
            <div
              style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: m.reparto ? repartoColor(m.reparto) : "var(--light-bg)",
                color: m.reparto ? "#fff" : "var(--gray-text)",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12,
              }}
            >
              {(m.full_name || m.email).split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {m.full_name || m.email}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--gray-text)" }}>{repartoLabel(m.reparto)}</div>
            </div>
            <div style={{ textAlign: "center", minWidth: 76 }}>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Georgia, serif" }}>{m.dirette}</div>
              <div style={{ fontSize: 10.5, color: "var(--gray-text)" }}>dirette</div>
            </div>
            <div style={{ textAlign: "center", minWidth: 76 }}>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Georgia, serif" }}>
                {m.votoMedio !== null ? m.votoMedio.toFixed(1) : "—"}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--gray-text)" }}>voto medio</div>
            </div>
            {m.reparto === "speaker" && (
              <div style={{ textAlign: "center", minWidth: 76 }}>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Georgia, serif", color: "var(--blue)" }}>
                  {m.puntualita !== null ? `${m.puntualita}%` : "—"}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--gray-text)" }}>puntualità</div>
              </div>
            )}
            {m.riunioniAssegnate > 0 && (
              <div style={{ textAlign: "center", minWidth: 76 }}>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Georgia, serif", color: "#8A6D3B" }}>
                  {m.presenzaRiunioni !== null ? `${m.presenzaRiunioni}%` : "—"}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--gray-text)" }}>presenze riunioni</div>
              </div>
            )}
          </div>
        ))}
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
