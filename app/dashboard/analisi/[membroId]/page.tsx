import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import { repartoColor, repartoLabel } from "@/lib/reparti";

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

export default async function MembroAnalisiPage({ params }: { params: { membroId: string } }) {
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

  const { data: membro } = await supabase.from("profiles").select("*").eq("id", params.membroId).maybeSingle();
  if (!membro) notFound();

  const adesso = new Date();

  // Eventi già avvenuti in cui la persona è coinvolta.
  const { data: eventiMembro } = await supabase
    .from("events")
    .select("id, titolo, quando, tipo")
    .contains("membri", [membro.id])
    .lte("quando", adesso.toISOString())
    .order("quando", { ascending: false });

  const dirette = (eventiMembro ?? []).filter((e) => e.tipo === "diretta");
  const riunioni = (eventiMembro ?? []).filter((e) => e.tipo === "riunione");

  // Valutazioni ricevute.
  const { data: voti } = await supabase
    .from("voti_membri")
    .select("evento_id, attitudine, professionalita, performance")
    .eq("membro_id", membro.id);

  const eventiVotiIds = Array.from(new Set((voti ?? []).map((v) => v.evento_id)));
  const { data: eventiVoti } = eventiVotiIds.length
    ? await supabase.from("events").select("id, titolo, quando").in("id", eventiVotiIds)
    : { data: [] as { id: string; titolo: string; quando: string }[] };

  const valutazioni = (voti ?? [])
    .map((v) => {
      const ev = (eventiVoti ?? []).find((e) => e.id === v.evento_id);
      const media = (v.attitudine + v.professionalita + v.performance) / 3;
      return { ...v, titolo: ev?.titolo ?? "Evento", quando: ev?.quando ?? "", media };
    })
    .sort((a, b) => (b.quando || "").localeCompare(a.quando || ""));

  const votoFinale = valutazioni.length ? valutazioni.reduce((a, v) => a + v.media, 0) / valutazioni.length : null;

  // Puntualità (timer) per gli speaker.
  const { data: sessioniTimer } = await supabase.from("timer_sessioni").select("precisione").eq("membro_id", membro.id);
  const puntualita = sessioniTimer && sessioniTimer.length
    ? Math.round(sessioniTimer.reduce((a, s) => a + s.precisione, 0) / sessioniTimer.length)
    : null;

  // Presenze alle riunioni già avvenute.
  const riunioniIds = riunioni.map((r) => r.id);
  const { data: presenze } = riunioniIds.length
    ? await supabase.from("presenze_riunioni").select("evento_id, presente").eq("membro_id", membro.id).in("evento_id", riunioniIds)
    : { data: [] as { evento_id: string; presente: boolean }[] };
  const presenti = (presenze ?? []).filter((p) => p.presente).length;
  const presenzaRiunioni = riunioni.length ? Math.round((presenti / riunioni.length) * 100) : null;

  // Task assegnate alla persona.
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, titolo, completato, puntata_data, reparto")
    .eq("assegnato_a", membro.id)
    .order("created_at", { ascending: false });

  const taskFatte = (tasks ?? []).filter((t) => t.completato).length;

  const nome = membro.full_name || membro.email;
  const iniziali = nome.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  const stats = [
    { label: "dirette fatte", valore: String(dirette.length) },
    { label: "voto finale", valore: votoFinale !== null ? votoFinale.toFixed(1) : "—" },
    ...(membro.reparto === "speaker" ? [{ label: "puntualità", valore: puntualita !== null ? `${puntualita}%` : "—" }] : []),
    ...(riunioni.length > 0 ? [{ label: "presenze riunioni", valore: presenzaRiunioni !== null ? `${presenzaRiunioni}%` : "—" }] : []),
    { label: "task completate", valore: `${taskFatte}/${(tasks ?? []).length}` },
  ];

  return (
    <div className="q-page fade-in-up">
      <Link href="/dashboard/analisi" className="q-back" style={{ display: "inline-block" }}>
        ‹ Torna alle analisi
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "14px 0 22px" }}>
        {membro.avatar_url ? (
          <img src={membro.avatar_url} alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
              background: membro.reparto ? repartoColor(membro.reparto) : "var(--light-bg)",
              color: membro.reparto ? "#fff" : "var(--gray-text)",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17,
            }}
          >
            {iniziali}
          </div>
        )}
        <div>
          <div className="val-eyebrow">{repartoLabel(membro.reparto)}</div>
          <div className="val-title">{nome}</div>
        </div>
      </div>

      {/* 1. Analisi complessive */}
      <div className="card card-static" style={{ marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "14px 12px" }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif" }}>{s.valore}</div>
              <div style={{ fontSize: 11, color: "var(--gray-text)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Dirette */}
      <div className="section-label" style={{ marginTop: 0 }}>Dirette fatte ({dirette.length})</div>
      <div className="card card-static" style={{ marginBottom: 22, padding: "4px 18px" }}>
        {dirette.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--gray-text)", margin: "14px 0" }}>Nessuna diretta ancora.</p>
        )}
        {dirette.map((e, i) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 13.5 }}>
            <span style={{ fontWeight: 600 }}>{e.titolo}</span>
            <span style={{ color: "var(--gray-text)", whiteSpace: "nowrap" }}>{formatData(e.quando)}</span>
          </div>
        ))}
      </div>

      {/* 3. Task */}
      <div className="section-label">Task ({taskFatte}/{(tasks ?? []).length} completate)</div>
      <div className="card card-static" style={{ marginBottom: 22, padding: "4px 18px" }}>
        {(tasks ?? []).length === 0 && (
          <p style={{ fontSize: 13, color: "var(--gray-text)", margin: "14px 0" }}>Nessuna task assegnata.</p>
        )}
        {(tasks ?? []).map((t, i) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--border)", fontSize: 13.5 }}>
            <span style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: t.completato ? "#16A34A" : "var(--gray-text)", fontWeight: 700 }}>{t.completato ? "✓" : "○"}</span>
              <span style={{ fontWeight: 600 }}>{t.titolo}</span>
            </span>
            <span style={{ color: "var(--gray-text)", whiteSpace: "nowrap", fontSize: 12.5 }}>
              {t.puntata_data ? formatData(t.puntata_data) : ""}
            </span>
          </div>
        ))}
      </div>

      {/* 4. Valutazioni */}
      <div className="section-label">
        Valutazioni ricevute ({valutazioni.length}){votoFinale !== null ? ` · voto finale ${votoFinale.toFixed(1)}` : ""}
      </div>
      <div className="card card-static" style={{ padding: "4px 18px" }}>
        {valutazioni.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--gray-text)", margin: "14px 0" }}>Nessuna valutazione ancora.</p>
        )}
        {valutazioni.map((v, i) => (
          <div key={`${v.evento_id}-${i}`} style={{ padding: "12px 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>{v.titolo}</span>
              <span style={{ fontWeight: 700, fontFamily: "Georgia, serif" }}>{v.media.toFixed(1)}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 3 }}>
              {v.quando ? `${formatData(v.quando)} · ` : ""}Attitudine {v.attitudine} · Professionalità {v.professionalita} · Performance {v.performance}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
