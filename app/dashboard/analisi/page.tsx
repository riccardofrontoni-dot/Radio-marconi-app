import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.ruolo !== "rad") {
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

  // Eventi (dirette) del mese, con le persone coinvolte.
  const { data: eventi } = await supabase
    .from("events")
    .select("id, titolo, quando, membri")
    .gte("quando", inizioMese.toISOString())
    .lte("quando", fineMese.toISOString());

  const eventIds = (eventi ?? []).map((e) => e.id);

  // Resoconti qualità collegati a quelle dirette.
  const { data: resoconti } = eventIds.length
    ? await supabase.from("quality_reports").select("evento_id, voto").in("evento_id", eventIds)
    : { data: [] as { evento_id: string; voto: number }[] };

  const votoPerEvento: Record<string, number> = {};
  (resoconti ?? []).forEach((r) => {
    if (r.evento_id) votoPerEvento[r.evento_id] = r.voto;
  });

  // Conteggio dirette e voti per membro.
  const direttePerMembro: Record<string, number> = {};
  const votiPerMembro: Record<string, number[]> = {};
  (eventi ?? []).forEach((e) => {
    const voto = votoPerEvento[e.id];
    (e.membri ?? []).forEach((mid: string) => {
      direttePerMembro[mid] = (direttePerMembro[mid] ?? 0) + 1;
      if (voto !== undefined) (votiPerMembro[mid] ??= []).push(voto);
    });
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
      return { ...m, dirette, votoMedio, votiCount: voti.length };
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
