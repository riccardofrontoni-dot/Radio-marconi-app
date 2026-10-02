"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { upsertQualityReport, salvaValutazioneCriteri, eliminaResocontoQualita } from "@/lib/actions";

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const TIPO_LABEL: Record<string, string> = { diretta: "Diretta", riunione: "Riunione", altro: "Altro" };
const STATO_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  in_revisione: { label: "In revisione", bg: "#FEF3C7", fg: "#92400E" },
  rimandato: { label: "Rimandato — da correggere", bg: "#FEE2E2", fg: "#991B1B" },
  approvato: { label: "Approvato", bg: "#DCFCE7", fg: "#166534" },
};
const CLASS_INFO: Record<string, { label: string; cls: string }> = {
  ok: { label: "OK", cls: "q-pillopt-ok" },
  da_migliorare: { label: "Da migliorare", cls: "q-pillopt-mig" },
  criticita: { label: "Criticità", cls: "q-pillopt-crit" },
};

type Evento = { id: string; titolo: string; quando: string; tipo: string };
type Resoconto = {
  evento_id: string; puntata_titolo: string; punti_di_forza: string | null;
  criticita: string | null; voto: number; stato: string; feedback_rad: string | null;
};
type Criterio = { id: string; testo: string; ordine: number };
type ValutazioneCriterio = {
  evento_id: string; criterio_id: string; classificazione: string; nota: string | null;
  responsabile_id: string | null; scadenza: string | null; task_id: string | null;
};
type Membro = { id: string; full_name: string | null; email: string; reparto: string | null };

export default function QualitaClient({
  anno, mese, eventi, resoconti, criteri, valutazioniCriteri, membri, aperte,
}: {
  anno: number; mese: number; eventi: Evento[]; resoconti: Resoconto[];
  criteri: Criterio[]; valutazioniCriteri: ValutazioneCriterio[]; membri: Membro[]; aperte: any[];
}) {
  const [eventoAperto, setEventoAperto] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [salvato, setSalvato] = useState<string | null>(null);
  const [classificazioni, setClassificazioni] = useState<Record<string, string>>({});

  const resocontoDi = (eventoId: string) => resoconti.find((r) => r.evento_id === eventoId);
  const valutazioneDi = (eventoId: string, criterioId: string) =>
    valutazioniCriteri.find((v) => v.evento_id === eventoId && v.criterio_id === criterioId);

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  const gruppi: { chiave: string; label: string; eventi: Evento[] }[] = [];
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

  const evento = eventoAperto ? eventi.find((e) => e.id === eventoAperto) : null;
  const resoconto = evento ? resocontoDi(evento.id) : undefined;

  function handleSalva(formData: FormData) {
    if (!evento) return;
    startTransition(async () => {
      await upsertQualityReport(evento.id, formData);
      setSalvato(evento.id);
      setTimeout(() => setSalvato(null), 2000);
    });
  }

  function handleSalvaChecklist(formData: FormData) {
    if (!evento) return;
    startTransition(async () => {
      await salvaValutazioneCriteri(evento.id, formData);
      setSalvato(evento.id);
      setTimeout(() => setSalvato(null), 2000);
    });
  }

  function handleElimina() {
    if (!evento || !resoconto) return;
    if (!confirm("Eliminare questo resoconto? Verranno cancellate anche la checklist e le eventuali task collegate.")) return;
    startTransition(async () => {
      await eliminaResocontoQualita(evento.id, evento.titolo);
      setEventoAperto(null);
    });
  }

  // Anello del voto: raggio 38 → circonferenza ≈ 238.76 (identico al mockup)
  const RING_R = 38;
  const RING_C = 2 * Math.PI * RING_R;

  // Voto "live": ricalcolato ad ogni click sulle pillole, non solo dopo il salvataggio.
  // Mappatura provvisoria OK=5 / Da migliorare=3 / Criticità=1 finché non mi confermi la formula esatta del server.
  const classeDi = (eventoId: string, criterioId: string) => {
    const chiave = `${eventoId}_${criterioId}`;
    return classificazioni[chiave] ?? valutazioneDi(eventoId, criterioId)?.classificazione ?? "ok";
  };
  const PUNTI: Record<string, number> = { ok: 5, da_migliorare: 3, criticita: 1 };
  const votoLive = evento && criteri.length > 0
    ? Math.round((criteri.reduce((tot, c) => tot + PUNTI[classeDi(evento.id, c.id)], 0) / criteri.length) * 10) / 10
    : null;
  const votoAttuale = votoLive ?? resoconto?.voto ?? null;
  const ringOffset = votoAttuale != null ? RING_C * (1 - votoAttuale / 5) : RING_C;

  // --- Pagina intera di dettaglio: sostituisce l'elenco quando una puntata è aperta ---
  if (evento) {
    return (
      <div className="q-page fade-in-up">
        <button onClick={() => setEventoAperto(null)} className="q-back">‹ Torna all'elenco</button>

        <div className="q-header">
          <div>
            <div className="val-eyebrow">Qualità · Resoconto</div>
            <h1 className="val-title">{evento.titolo}</h1>
            <p className="val-subtitle" style={{ marginBottom: 0 }}>
              {new Date(evento.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="q-ring-wrap">
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={RING_R} fill="none" stroke="#E5E5EA" strokeWidth="7" />
              <circle
                className="q-ring-fg"
                cx="44" cy="44" r={RING_R} fill="none" stroke="var(--blue)" strokeWidth="7"
                strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={ringOffset}
                transform="rotate(-90 44 44)"
              />
            </svg>
            <div className="q-ring-value">
              <span className="q-ring-num">{votoAttuale != null ? votoAttuale : "—"}</span>
              <span className="q-ring-den">su 5</span>
            </div>
          </div>
        </div>

        {resoconto?.feedback_rad && (
          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: 12, marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Feedback del RAD</div>
            <p style={{ fontSize: 12.5, color: "#78350F", margin: 0 }}>{resoconto.feedback_rad}</p>
          </div>
        )}

        <form action={handleSalva} className="card card-static" style={{ padding: "6px 24px", marginBottom: 18 }}>
          <input type="hidden" name="puntata_titolo" value={evento.titolo} />
          <div className="evt-field">
            <label className="evt-label">Punti di forza</label>
            <textarea name="punti_di_forza" defaultValue={resoconto?.punti_di_forza ?? ""} placeholder="Cosa ha funzionato bene" className="evt-input" style={{ minHeight: 50 }} />
          </div>
          <div className="evt-field" style={{ borderBottom: "none" }}>
            <label className="evt-label">Criticità</label>
            <textarea name="criticita" defaultValue={resoconto?.criticita ?? ""} placeholder="Cosa migliorare per la prossima volta" className="evt-input" style={{ minHeight: 50 }} />
          </div>
          <div className="q-actions" style={{ marginTop: 6, marginBottom: 16 }}>
            <button type="submit" className="q-btn-primary">
              {isPending ? "Salvataggio…" : resoconto ? "Aggiorna resoconto" : "Salva resoconto"}
            </button>
          </div>
        </form>
        {salvato === evento.id && <p style={{ fontSize: 12, color: "#166534", margin: "-10px 0 18px" }}>Salvato.</p>}

        <div className="card card-static" style={{ padding: "6px 24px" }}>
          <div className="section-label" style={{ margin: "18px 0 4px" }}>Checklist qualità</div>
          <form action={handleSalvaChecklist}>
            {criteri.map((c) => {
              const salvataggio = valutazioneDi(evento.id, c.id);
              const classe = classeDi(evento.id, c.id);
              const chiave = `${evento.id}_${c.id}`;
              return (
                <div key={c.id} className="q-criterio">
                  <div className="q-criterio-top">
                    <span className="q-criterio-label">{c.testo}</span>
                    <div className="q-pill-group">
                      {(["ok", "da_migliorare", "criticita"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setClassificazioni((s) => ({ ...s, [chiave]: v }))}
                          className={`q-pillopt ${CLASS_INFO[v].cls}${classe === v ? " q-pillopt-on" : ""}`}
                        >
                          {CLASS_INFO[v].label}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" name={`classificazione_${c.id}`} value={classe} />
                  </div>

                  {classe !== "ok" && (
                    <div className="q-resp-box">
                      <div className="q-resp-grid">
                        <div>
                          <label className="evt-label">Responsabile</label>
                          <select name={`responsabile_${c.id}`} defaultValue={salvataggio?.responsabile_id ?? ""} className="evt-input" style={{ fontWeight: 600 }}>
                            <option value="">Nessuno</option>
                            {membri.map((m) => (
                              <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="evt-label">Entro il</label>
                          <input name={`scadenza_${c.id}`} type="date" defaultValue={salvataggio?.scadenza ?? ""} className="evt-input" style={{ fontWeight: 600 }} />
                        </div>
                      </div>
                      <label className="evt-label">Nota (facoltativa)</label>
                      <textarea
                        name={`nota_${c.id}`}
                        defaultValue={salvataggio?.nota ?? ""}
                        placeholder="Aggiungi dettagli per chi dovrà occuparsene…"
                        className="evt-input"
                        style={{ minHeight: 46 }}
                      />
                      <p className="evt-note" style={{ marginTop: 10 }}>Se scegli un responsabile, gli arriva automaticamente una task e un avviso.</p>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="q-actions">
              <button type="submit" className="q-btn-secondary">
                {isPending ? "Salvataggio…" : "Salva checklist"}
              </button>
            </div>
          </form>

          {resoconto && (
            <button
              type="button"
              onClick={handleElimina}
              style={{ border: "none", background: "none", color: "#c22", fontSize: 12, cursor: "pointer", margin: "6px 0 18px", padding: 0 }}
            >
              Elimina resoconto
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Resoconto puntata</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={`/dashboard/qualita?mese=${mesePrec}`} className="evt-pill">‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/qualita?mese=${meseSucc}`} className="evt-pill">›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Dirette e riunioni del mese. Apri una puntata per scrivere o modificare il resoconto.
      </p>

      {aperte.length > 0 && (
        <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 14, padding: "14px 18px", marginBottom: 24 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>
            ⚠ {aperte.length} {aperte.length === 1 ? "azione ancora aperta" : "azioni ancora aperte"} dalle puntate precedenti
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {aperte.slice(0, 5).map((a: any) => (
              <div key={a.criterio_id + a.evento_id} style={{ fontSize: 12, color: "#78350F" }}>
                {a.tasks?.titolo} — {a.events?.titolo}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card fade-in-up">
        {gruppi.length === 0 && (
          <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna diretta o riunione questo mese.</p>
        )}

        {gruppi.map((g) => (
          <div key={g.chiave}>
            <div className="val-day-label" style={{ textTransform: "capitalize" }}>{g.label}</div>
            {g.eventi.map((e) => {
              const r = resocontoDi(e.id);
              const stato = r ? STATO_LABEL[r.stato] : null;
              return (
                <button key={e.id} onClick={() => setEventoAperto(e.id)} className="val-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="val-row-title">{e.titolo}</div>
                    <div className="val-row-meta">
                      {TIPO_LABEL[e.tipo]} · {new Date(e.quando).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span
                    className="val-badge"
                    style={{ background: stato ? stato.bg : "var(--light-bg)", color: stato ? stato.fg : "var(--gray-text)" }}
                  >
                    {stato ? stato.label : "Nessun resoconto"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
