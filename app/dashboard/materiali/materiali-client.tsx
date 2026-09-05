"use client";

import { useRef, useState, useTransition } from "react";
import { caricaMateriale, eliminaMateriale } from "@/lib/actions";
import { REPARTI, repartoColor, repartoLabel } from "@/lib/reparti";

type Materiale = {
  id: string;
  nome: string;
  descrizione: string | null;
  storage_path: string;
  tipo: string | null;
  dimensione: number | null;
  categoria: string;
  reparto: string | null;
  evento_id: string | null;
  caricato_da: string | null;
  creato_il: string;
  url: string | null;
  nomeCaricatore: string;
};
type EventoFormazione = { id: string; titolo: string; quando: string; reparti_coinvolti: string[] | null };

const TAB_LABEL: Record<string, string> = { guida: "Guida a Radio Marconi", tutorial: "Tutorial", formazione: "Formazione" };
const TAB_DESC: Record<string, string> = {
  guida: "Come funziona la radio — reparti, dirette, uso della dashboard.",
  tutorial: "Materiali divisi per reparto — scegli il tuo qui sotto.",
  formazione: "Le slide usate durante gli incontri di formazione del sabato.",
};

function icona(tipo: string | null) {
  if (!tipo) return "📄";
  if (tipo.includes("pdf")) return "📕";
  if (tipo.includes("word") || tipo.includes("doc")) return "📘";
  if (tipo.includes("sheet") || tipo.includes("excel") || tipo.includes("xls")) return "📗";
  if (tipo.includes("presentation") || tipo.includes("powerpoint") || tipo.includes("ppt")) return "📙";
  if (tipo.includes("image") || tipo.includes("png") || tipo.includes("jpg") || tipo.includes("jpeg")) return "🖼";
  if (tipo.includes("zip") || tipo.includes("rar")) return "🗂";
  return "📄";
}

function formattaDimensione(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialiClient({
  materiali,
  eventiFormazione,
  mioId,
  sonoRad,
  puoCaricareGuida,
  puoCaricareFormazione,
  puoCaricareTutorial,
  repartoCapo,
  mioReparto,
}: {
  materiali: Materiale[];
  eventiFormazione: EventoFormazione[];
  mioId: string;
  sonoRad: boolean;
  puoCaricareGuida: boolean;
  puoCaricareFormazione: boolean;
  puoCaricareTutorial: boolean;
  repartoCapo: string | null;
  mioReparto: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"guida" | "tutorial" | "formazione">("guida");
  const [repartoTutorial, setRepartoTutorial] = useState(repartoCapo || mioReparto || "speaker");
  const [mostraForm, setMostraForm] = useState(false);
  const [eventoFormazioneAperto, setEventoFormazioneAperto] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [anteprima, setAnteprima] = useState<{ nomeFile: string; dimensione: number; tipo: string; url: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const puoCaricareTabAttuale =
    tab === "guida" ? puoCaricareGuida : tab === "formazione" ? puoCaricareFormazione : puoCaricareTutorial;

  function fileScelto() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setAnteprima(null);
      return;
    }
    const isImmagine = file.type.startsWith("image/");
    setAnteprima({
      nomeFile: file.name,
      dimensione: file.size,
      tipo: file.type,
      url: isImmagine ? URL.createObjectURL(file) : null,
    });
    if (!nome) setNome(file.name);
  }

  function mostraToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function carica() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("nome", nome || file.name);
    fd.set("descrizione", descrizione);
    fd.set("categoria", tab);
    if (tab === "tutorial") fd.set("reparto", repartoCapo || repartoTutorial);
    if (tab === "formazione" && eventoFormazioneAperto) fd.set("evento_id", eventoFormazioneAperto);
    startTransition(async () => {
      await caricaMateriale(fd);
      mostraToast("Documento caricato");
      setNome("");
      setDescrizione("");
      setAnteprima(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function elimina(id: string, storagePath: string) {
    startTransition(async () => {
      await eliminaMateriale(id, storagePath);
      mostraToast("Documento eliminato");
    });
  }

  const materialiVisibili = materiali.filter((m) => {
    if (m.categoria !== tab) return false;
    if (tab === "tutorial") return m.reparto === repartoTutorial;
    return true;
  });

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Materiali</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 20 }}>
        Guide, tutorial e slide condivise — visibili a tutti.
      </p>

      <div style={{ display: "flex", gap: 4, background: "var(--light-bg)", borderRadius: 10, padding: 4, marginBottom: 6, maxWidth: 560 }}>
        {(["guida", "tutorial", "formazione"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMostraForm(false); }}
            style={{
              flex: 1, padding: "8px 6px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: tab === t ? "var(--white)" : "transparent",
              color: tab === t ? "var(--dark)" : "var(--gray-text)",
            }}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--gray-text)", marginBottom: 20 }}>{TAB_DESC[tab]}</p>

      {tab === "tutorial" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {REPARTI.map((r) => (
            <button
              key={r.value}
              onClick={() => setRepartoTutorial(r.value)}
              style={{
                fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${repartoTutorial === r.value ? r.color : "var(--border)"}`,
                background: repartoTutorial === r.value ? r.color : "var(--white)",
                color: repartoTutorial === r.value ? "#fff" : "var(--dark)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {puoCaricareTabAttuale && tab !== "formazione" && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setMostraForm(!mostraForm)} className="btn-primary" style={{ fontSize: 12.5 }}>
            {mostraForm ? "Annulla" : "+ Carica documento"}
          </button>

          {mostraForm && (
            <div className="card" style={{ padding: 18, marginTop: 12, maxWidth: 480 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {tab === "tutorial" && (
                  <p style={{ fontSize: 12, color: "var(--gray-text)", margin: 0 }}>
                    Verrà caricato per il reparto <b>{repartoLabel(repartoCapo || repartoTutorial)}</b>.
                  </p>
                )}
                <input ref={fileRef} type="file" onChange={fileScelto} style={{ fontSize: 12.5 }} />

                {anteprima && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--light-bg)", borderRadius: 10, padding: 10 }}>
                    {anteprima.url ? (
                      <img src={anteprima.url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <span style={{ fontSize: 26, flexShrink: 0 }}>{icona(anteprima.tipo)}</span>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {anteprima.nomeFile}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--gray-text)" }}>{formattaDimensione(anteprima.dimensione)}</div>
                    </div>
                  </div>
                )}

                <input value={nome} onChange={(e) => setNome(e.target.value)} type="text" placeholder="Nome (facoltativo)" style={inputStyle} />
                <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} type="text" placeholder="Descrizione (facoltativa)" style={inputStyle} />
                <button onClick={carica} disabled={isPending} className="btn-primary">
                  {isPending ? "Caricamento…" : "Carica"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "formazione" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {eventiFormazione.length === 0 && (
            <p className="placeholder-note" style={{ marginTop: 0 }}>Nessuna giornata di formazione sul calendario ancora.</p>
          )}
          {eventiFormazione.map((ev) => {
            const materiale = materiali.find((m) => m.categoria === "formazione" && m.evento_id === ev.id);
            const aperto = eventoFormazioneAperto === ev.id;
            return (
              <div key={ev.id} className="card" style={{ padding: 16 }}>
                <button
                  onClick={() => { setEventoFormazioneAperto(aperto ? null : ev.id); setAnteprima(null); setNome(""); setDescrizione(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", padding: 0 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.titolo}</div>
                    <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 2, textTransform: "capitalize" }}>
                      {new Date(ev.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    {ev.reparti_coinvolti && ev.reparti_coinvolti.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                        {ev.reparti_coinvolti.map((r) => (
                          <span key={r} style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: repartoColor(r), borderRadius: 999, padding: "2px 8px" }}>
                            {repartoLabel(r)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {materiale && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#166534", background: "#DCFCE7", borderRadius: 999, padding: "4px 10px", flexShrink: 0 }}>
                      Materiale caricato
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--gray-text)", transform: aperto ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", flexShrink: 0 }}>▾</span>
                </button>

                {aperto && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    {materiale ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{icona(materiale.tipo)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{materiale.nome}</div>
                          <div style={{ fontSize: 11, color: "var(--gray-text)" }}>{materiale.nomeCaricatore}</div>
                        </div>
                        {materiale.url && (
                          <a href={materiale.url} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: 12, padding: "7px 13px", textDecoration: "none", flexShrink: 0 }}>
                            Apri il materiale
                          </a>
                        )}
                        {(materiale.caricato_da === mioId || sonoRad) && (
                          <button onClick={() => elimina(materiale.id, materiale.storage_path)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer", flexShrink: 0 }}>
                            Elimina
                          </button>
                        )}
                      </div>
                    ) : puoCaricareFormazione ? (
                      <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
                        <input ref={fileRef} type="file" onChange={fileScelto} style={{ fontSize: 12.5 }} />
                        {anteprima && (
                          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--light-bg)", borderRadius: 10, padding: 10 }}>
                            {anteprima.url ? (
                              <img src={anteprima.url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                            ) : (
                              <span style={{ fontSize: 22, flexShrink: 0 }}>{icona(anteprima.tipo)}</span>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{anteprima.nomeFile}</div>
                              <div style={{ fontSize: 10.5, color: "var(--gray-text)" }}>{formattaDimensione(anteprima.dimensione)}</div>
                            </div>
                          </div>
                        )}
                        <input value={nome} onChange={(e) => setNome(e.target.value)} type="text" placeholder="Nome (facoltativo)" style={inputStyle} />
                        <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} type="text" placeholder="Descrizione (facoltativa)" style={inputStyle} />
                        <button onClick={carica} disabled={isPending} className="btn-primary">
                          {isPending ? "Caricamento…" : "Carica materiale"}
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12.5, color: "var(--gray-text)", fontStyle: "italic", margin: 0 }}>
                        Nessun materiale caricato ancora per questa giornata.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab !== "formazione" && materialiVisibili.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun documento qui ancora.</p>
      )}

      {tab !== "formazione" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {materialiVisibili.map((m) => (
          <div key={m.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{icona(m.tipo)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.nome}
              </div>
              <div style={{ fontSize: 11, color: "var(--gray-text)", marginTop: 2 }}>
                {m.nomeCaricatore} · {new Date(m.creato_il).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                {m.dimensione ? ` · ${formattaDimensione(m.dimensione)}` : ""}
              </div>
              {m.descrizione && (
                <div style={{ fontSize: 12, color: "var(--dark)", marginTop: 4 }}>{m.descrizione}</div>
              )}
            </div>
            {m.url && (
              <a href={m.url} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: 12, padding: "7px 13px", textDecoration: "none", flexShrink: 0 }}>
                Scarica
              </a>
            )}
            {(m.caricato_da === mioId || sonoRad) && (
              <button onClick={() => elimina(m.id, m.storage_path)} style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer", flexShrink: 0 }}>
                Elimina
              </button>
            )}
          </div>
        ))}
      </div>
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

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
