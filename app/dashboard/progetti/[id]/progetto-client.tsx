"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  impostaStatoProgetto, creaTaskProgetto, impostaStatoTask, deleteTask,
  caricaMateriale, eliminaMateriale, salvaCompitoProgetto,
  creaObiettivoProgetto, updateObiettivoProgettoManuale, eliminaObiettivoProgetto,
  creaEventoProgetto,
} from "@/lib/actions";
import { repartoColor, repartoLabel } from "@/lib/reparti";

const STATO_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  in_corso: { label: "In corso", bg: "#DBEAFE", fg: "#1E40AF" },
  completato: { label: "Completato", bg: "#DCFCE7", fg: "#166534" },
  archiviato: { label: "Archiviato", bg: "#F1F1F3", fg: "#6E6E73" },
};

function icona(tipo: string | null) {
  if (!tipo) return "📄";
  if (tipo.includes("pdf")) return "📕";
  if (tipo.includes("word") || tipo.includes("doc")) return "📘";
  if (tipo.includes("sheet") || tipo.includes("excel")) return "📗";
  if (tipo.includes("presentation") || tipo.includes("powerpoint")) return "📙";
  if (tipo.includes("image")) return "🖼";
  return "📄";
}

export default function ProgettoWorkspaceClient({
  progetto, tasks, materiali, compiti, obiettivi, eventi, partecipanti, andamento, puoGestire, mioId,
}: {
  progetto: any; tasks: any[]; materiali: any[]; compiti: any[]; obiettivi: any[]; eventi: any[];
  partecipanti: any[]; andamento: number; puoGestire: boolean; mioId: string;
}) {
  const [tab, setTab] = useState<"home" | "task" | "materiali" | "compiti" | "scadenze">("home");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function mostraToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  const nomePersona = (id: string) => partecipanti.find((p) => p.id === id)?.full_name || partecipanti.find((p) => p.id === id)?.email || "—";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <div>
          <Link href="/dashboard/progetti" style={{ fontSize: 12, color: "var(--gray-text)" }}>← Tutti i progetti</Link>
          <h2 style={{ fontSize: 22, marginTop: 4 }}>{progetto.nome}</h2>
        </div>
        {puoGestire ? (
          <select
            value={progetto.stato}
            onChange={(e) => startTransition(async () => { await impostaStatoProgetto(progetto.id, e.target.value); mostraToast("Stato aggiornato"); })}
            style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, border: "none", background: STATO_LABEL[progetto.stato].bg, color: STATO_LABEL[progetto.stato].fg }}
          >
            <option value="in_corso">In corso</option>
            <option value="completato">Completato</option>
            <option value="archiviato">Archiviato</option>
          </select>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, background: STATO_LABEL[progetto.stato].bg, color: STATO_LABEL[progetto.stato].fg }}>
            {STATO_LABEL[progetto.stato].label}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, background: "var(--light-bg)", borderRadius: 10, padding: 4, margin: "16px 0 22px", maxWidth: 620, overflowX: "auto" }}>
        {(["home", "task", "materiali", "compiti", "scadenze"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: "1 0 auto", padding: "8px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
              background: tab === t ? "var(--white)" : "transparent",
              color: tab === t ? "var(--dark)" : "var(--gray-text)",
            }}
          >
            {t === "home" ? "Home" : t === "task" ? "Task" : t === "materiali" ? "Materiali" : t === "compiti" ? "Divisione compiti" : "Scadenze"}
          </button>
        ))}
      </div>

      {tab === "home" && (
        <TabHome progetto={progetto} andamento={andamento} eventi={eventi} puoGestire={puoGestire} onToast={mostraToast} />
      )}
      {tab === "task" && (
        <TabTask progettoId={progetto.id} tasks={tasks} partecipanti={partecipanti} puoGestire={puoGestire} nomePersona={nomePersona} onToast={mostraToast} />
      )}
      {tab === "materiali" && (
        <TabMateriali progettoId={progetto.id} materiali={materiali} puoGestire={puoGestire} mioId={mioId} onToast={mostraToast} />
      )}
      {tab === "compiti" && (
        <TabCompiti progettoId={progetto.id} partecipanti={partecipanti} compiti={compiti} puoGestire={puoGestire} onToast={mostraToast} />
      )}
      {tab === "scadenze" && (
        <TabScadenze progettoId={progetto.id} obiettivi={obiettivi} andamento={andamento} puoGestire={puoGestire} onToast={mostraToast} />
      )}

      <div
        style={{
          position: "fixed", bottom: 26, right: 26, background: "var(--dark)", color: "#fff", padding: "13px 18px",
          borderRadius: 13, fontSize: 13.5, display: "flex", alignItems: "center", gap: 10,
          transform: toast ? "translateY(0)" : "translateY(140%)", transition: "transform 0.3s cubic-bezier(.22,.9,.32,1)", zIndex: 50,
          boxShadow: "0 14px 30px -10px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>✓</span>
        <span>{toast}</span>
      </div>
    </div>
  );
}

// ============================================================
// HOME
// ============================================================
function TabHome({ progetto, andamento, eventi, puoGestire, onToast }: any) {
  const [isPending, startTransition] = useTransition();
  const [mostraForm, setMostraForm] = useState(false);

  function salva(formData: FormData) {
    startTransition(async () => {
      await creaEventoProgetto(progetto.id, formData);
      setMostraForm(false);
      onToast("Scadenza aggiunta al calendario del progetto");
    });
  }

  return (
    <div>
      <div className="section-label" style={{ marginTop: 0 }}>Andamento del progetto</div>
      <div style={{ background: "var(--light-bg)", borderRadius: 16, padding: "20px 22px", marginBottom: 26, maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Task completate</span>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", color: "var(--blue)" }}>{andamento}%</span>
        </div>
        <div style={{ height: 9, borderRadius: 999, background: "var(--white)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${andamento}%`, background: "var(--blue)", borderRadius: 999, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div className="section-label">Scheda progetto</div>
      <div className="card" style={{ padding: 20, marginBottom: 26, maxWidth: 620 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 12, fontSize: 12.5 }}>
          <div><b>Partenza:</b> {progetto.data_inizio ? new Date(progetto.data_inizio).toLocaleDateString("it-IT") : "—"}</div>
          <div><b>Scadenza:</b> {progetto.data_scadenza ? new Date(progetto.data_scadenza).toLocaleDateString("it-IT") : "—"}</div>
          <div><b>Assegnato da:</b> {progetto.assegnato_da || "—"}</div>
        </div>
        {progetto.reparti_coinvolti?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {progetto.reparti_coinvolti.map((r: string) => (
              <span key={r} style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: repartoColor(r), borderRadius: 999, padding: "3px 9px" }}>{repartoLabel(r)}</span>
            ))}
          </div>
        )}
        {progetto.descrizione && <p style={{ fontSize: 13, margin: "8px 0" }}>{progetto.descrizione}</p>}
        {progetto.bandoUrl && (
          <a href={progetto.bandoUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: 12, padding: "7px 14px", textDecoration: "none", display: "inline-block", marginTop: 6 }}>
            Scarica il bando
          </a>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="section-label" style={{ marginTop: 0, marginBottom: 0 }}>Calendario del progetto</div>
        {puoGestire && (
          <button onClick={() => setMostraForm(!mostraForm)} className="btn-primary" style={{ fontSize: 11.5, padding: "6px 12px" }}>
            {mostraForm ? "Annulla" : "+ Aggiungi scadenza"}
          </button>
        )}
      </div>

      {mostraForm && (
        <form action={salva} style={{ background: "var(--light-bg)", borderRadius: 12, padding: 14, display: "flex", gap: 8, marginBottom: 16, maxWidth: 480, flexWrap: "wrap" }}>
          <input name="titolo" type="text" required placeholder="Nome della scadenza/incontro" style={{ flex: 2, minWidth: 160, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12.5 }} />
          <input name="data" type="date" required style={{ flex: 1, minWidth: 130, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12.5 }} />
          <button type="submit" className="btn-primary" style={{ fontSize: 12.5 }}>Salva</button>
        </form>
      )}

      {eventi.length === 0 && <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun appuntamento sul calendario di questo progetto ancora.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 480 }}>
        {eventi.map((e: any) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{e.titolo}</span>
            <span style={{ fontSize: 11.5, color: "var(--gray-text)" }}>{new Date(e.quando).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TASK
// ============================================================
function TabTask({ progettoId, tasks, partecipanti, puoGestire, nomePersona, onToast }: any) {
  const [isPending, startTransition] = useTransition();
  const [mostraForm, setMostraForm] = useState(false);

  function salva(formData: FormData) {
    startTransition(async () => {
      await creaTaskProgetto(progettoId, formData);
      setMostraForm(false);
      onToast("Task creata");
    });
  }
  function segna(id: string, stato: string) {
    startTransition(async () => { await impostaStatoTask(id, stato === "completata" ? "da_fare" : "completata"); onToast("Task aggiornata"); });
  }
  function elimina(id: string) {
    startTransition(async () => { await deleteTask(id); onToast("Task eliminata"); });
  }

  return (
    <div>
      {puoGestire && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setMostraForm(!mostraForm)} className="btn-primary" style={{ fontSize: 12.5 }}>
            {mostraForm ? "Annulla" : "+ Nuova task"}
          </button>
          {mostraForm && (
            <form action={salva} style={{ background: "var(--light-bg)", borderRadius: 14, padding: 16, display: "grid", gap: 10, marginTop: 12, maxWidth: 480 }}>
              <input name="titolo" type="text" required placeholder="Titolo della task" style={inputStyle} />
              <textarea name="descrizione" placeholder="Descrizione (facoltativa)" style={{ ...inputStyle, minHeight: 60 }} />
              <select name="assegnato_a" style={inputStyle} defaultValue="">
                <option value="">Nessun assegnatario</option>
                {partecipanti.map((p: any) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
              </select>
              <input name="scadenza" type="date" style={inputStyle} />
              <button type="submit" className="btn-primary">Crea task</button>
            </form>
          )}
        </div>
      )}

      {tasks.length === 0 && <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna task per questo progetto ancora.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tasks.map((t: any) => (
          <div key={t.id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <input type="checkbox" checked={t.stato === "completata"} onChange={() => segna(t.id, t.stato)} style={{ width: 18, height: 18, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: t.stato === "completata" ? "line-through" : "none", color: t.stato === "completata" ? "var(--gray-text)" : "var(--dark)" }}>{t.titolo}</div>
              <div style={{ fontSize: 11, color: "var(--gray-text)" }}>
                {t.assegnato_a ? nomePersona(t.assegnato_a) : "Non assegnata"}
                {t.puntata_data && ` · entro ${new Date(t.puntata_data).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`}
              </div>
            </div>
            {puoGestire && (
              <button onClick={() => elimina(t.id)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer", flexShrink: 0 }}>Elimina</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MATERIALI
// ============================================================
function TabMateriali({ progettoId, materiali, puoGestire, mioId, onToast }: any) {
  const [isPending, startTransition] = useTransition();
  const [mostraForm, setMostraForm] = useState(false);
  const [nome, setNome] = useState("");

  function carica(formData: FormData) {
    startTransition(async () => {
      formData.set("categoria", "progetto");
      formData.set("progetto_id", progettoId);
      formData.set("nome", nome);
      await caricaMateriale(formData);
      setMostraForm(false);
      setNome("");
      onToast("Materiale caricato");
    });
  }
  function elimina(id: string, path: string) {
    startTransition(async () => { await eliminaMateriale(id, path); onToast("Materiale eliminato"); });
  }

  return (
    <div>
      {puoGestire && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setMostraForm(!mostraForm)} className="btn-primary" style={{ fontSize: 12.5 }}>
            {mostraForm ? "Annulla" : "+ Carica materiale"}
          </button>
          {mostraForm && (
            <form action={carica} style={{ background: "var(--light-bg)", borderRadius: 14, padding: 16, display: "grid", gap: 10, marginTop: 12, maxWidth: 460 }}>
              <input name="file" type="file" required style={{ fontSize: 12.5 }} />
              <input value={nome} onChange={(e) => setNome(e.target.value)} type="text" placeholder="Nome (facoltativo)" style={inputStyle} />
              <input name="descrizione" type="text" placeholder="Descrizione (facoltativa)" style={inputStyle} />
              <button type="submit" className="btn-primary">Carica</button>
            </form>
          )}
        </div>
      )}

      {materiali.length === 0 && <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun materiale caricato per questo progetto ancora.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {materiali.map((m: any) => (
          <div key={m.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
            <span style={{ fontSize: 22 }}>{icona(m.tipo)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.nome}</div>
              {m.descrizione && <div style={{ fontSize: 12, color: "var(--dark)" }}>{m.descrizione}</div>}
            </div>
            {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: 12, padding: "7px 13px", textDecoration: "none" }}>Scarica</a>}
            {(m.caricato_da === mioId || puoGestire) && (
              <button onClick={() => elimina(m.id, m.storage_path)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>Elimina</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DIVISIONE COMPITI
// ============================================================
function TabCompiti({ progettoId, partecipanti, compiti, puoGestire, onToast }: any) {
  const [isPending, startTransition] = useTransition();
  const [valori, setValori] = useState<Record<string, string>>(
    Object.fromEntries(partecipanti.map((p: any) => [p.id, compiti.find((c: any) => c.persona_id === p.id)?.compito ?? ""]))
  );

  function salva(personaId: string) {
    startTransition(async () => {
      await salvaCompitoProgetto(progettoId, personaId, valori[personaId] ?? "");
      onToast("Compito salvato");
    });
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--gray-text)", marginBottom: 20 }}>
        Chi fa cosa in questo progetto.
      </p>
      {partecipanti.length === 0 && <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun partecipante ancora.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {partecipanti.map((p: any) => (
          <div key={p.id} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: repartoColor(p.reparto), color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {(p.full_name || p.email).split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 130, flexShrink: 0 }}>{p.full_name || p.email}</span>
            {puoGestire ? (
              <>
                <input
                  value={valori[p.id] ?? ""}
                  onChange={(e) => setValori((v) => ({ ...v, [p.id]: e.target.value }))}
                  placeholder="Di cosa si occupa..."
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12.5 }}
                />
                <button onClick={() => salva(p.id)} disabled={isPending} className="btn-primary" style={{ fontSize: 11.5, padding: "6px 12px", flexShrink: 0 }}>Salva</button>
              </>
            ) : (
              <span style={{ fontSize: 12.5, color: valori[p.id] ? "var(--dark)" : "var(--gray-text)", fontStyle: valori[p.id] ? "normal" : "italic" }}>
                {valori[p.id] || "Non ancora assegnato"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SCADENZE
// ============================================================
function TabScadenze({ progettoId, obiettivi, andamento, puoGestire, onToast }: any) {
  const [isPending, startTransition] = useTransition();
  const [mostraForm, setMostraForm] = useState(false);

  function salva(formData: FormData) {
    startTransition(async () => {
      await creaObiettivoProgetto(progettoId, formData);
      setMostraForm(false);
      onToast("Scadenza aggiunta");
    });
  }
  function elimina(id: string) {
    startTransition(async () => { await eliminaObiettivoProgetto(id, progettoId); onToast("Scadenza eliminata"); });
  }
  function slider(id: string, valore: number) {
    startTransition(async () => { await updateObiettivoProgettoManuale(id, valore); });
  }

  return (
    <div>
      {puoGestire && (
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setMostraForm(!mostraForm)} className="btn-primary" style={{ fontSize: 12.5 }}>
            {mostraForm ? "Annulla" : "+ Nuova scadenza"}
          </button>
          {mostraForm && (
            <form action={salva} style={{ background: "var(--light-bg)", borderRadius: 14, padding: 16, display: "grid", gap: 10, marginTop: 12, maxWidth: 460 }}>
              <input name="titolo" type="text" required placeholder="Es. Consegna bozza montaggio" style={inputStyle} />
              <textarea name="descrizione" placeholder="Descrizione (facoltativa)" style={{ ...inputStyle, minHeight: 50 }} />
              <input name="scadenza" type="date" style={inputStyle} />
              <select name="tipo" style={inputStyle} defaultValue="task">
                <option value="task">Automatico — % task completate del progetto</option>
                <option value="manuale">Manuale — imposti tu la percentuale</option>
              </select>
              <button type="submit" className="btn-primary">Salva</button>
            </form>
          )}
        </div>
      )}

      {obiettivi.length === 0 && <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna scadenza impostata ancora.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {obiettivi.map((o: any) => {
          const percentuale = o.tipo === "task" ? andamento : o.progresso_manuale;
          const giorni = o.scadenza ? Math.ceil((new Date(o.scadenza).getTime() - Date.now()) / 86400000) : null;
          return (
            <div key={o.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif" }}>{o.titolo}</div>
                  {o.descrizione && <p style={{ fontSize: 12.5, color: "var(--gray-text)", margin: "3px 0 0" }}>{o.descrizione}</p>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif", color: "var(--blue)" }}>{percentuale}%</span>
                  {puoGestire && (
                    <button onClick={() => elimina(o.id)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>Elimina</button>
                  )}
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--light-bg)", overflow: "hidden", marginTop: 10 }}>
                <div style={{ height: "100%", width: `${percentuale}%`, background: "var(--blue)", borderRadius: 999, transition: "width 0.3s ease" }} />
              </div>
              {o.tipo === "manuale" && puoGestire && (
                <input type="range" min={0} max={100} defaultValue={o.progresso_manuale} onMouseUp={(e) => slider(o.id, Number((e.target as HTMLInputElement).value))} style={{ width: "100%", marginTop: 8, accentColor: "var(--blue)" }} />
              )}
              {o.scadenza && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 10.5, color: "var(--gray-text)" }}>{o.tipo === "task" ? "Automatico — task del progetto" : "Manuale"}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: giorni !== null && giorni < 0 ? "#DC2626" : giorni !== null && giorni <= 3 ? "#D97706" : "var(--gray-text)" }}>
                    {giorni === null ? "" : giorni < 0 ? `Scaduta da ${Math.abs(giorni)} giorni` : giorni === 0 ? "Scade oggi" : `Tra ${giorni} giorni`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
