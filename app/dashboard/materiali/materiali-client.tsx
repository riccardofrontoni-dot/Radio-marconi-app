"use client";

import { useRef, useState, useTransition } from "react";
import { caricaMateriale, eliminaMateriale } from "@/lib/actions";

type Materiale = {
  id: string;
  nome: string;
  descrizione: string | null;
  storage_path: string;
  tipo: string | null;
  dimensione: number | null;
  caricato_da: string | null;
  creato_il: string;
  url: string | null;
  nomeCaricatore: string;
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
  mioId,
  sonoRad,
  puoCaricare,
}: {
  materiali: Materiale[];
  mioId: string;
  sonoRad: boolean;
  puoCaricare: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [anteprima, setAnteprima] = useState<{ nomeFile: string; dimensione: number; tipo: string; url: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 6 }}>Materiali</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Guide, format e documenti condivisi — visibili a tutti, caricabili da chiunque.
      </p>

      {puoCaricare && (
        <div className="card" style={{ padding: 18, marginBottom: 28, maxWidth: 560 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-text)", textTransform: "uppercase", marginBottom: 14 }}>
            Carica un documento
          </div>
          <div style={{ display: "grid", gap: 10 }}>
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

            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              type="text"
              placeholder="Nome (facoltativo — usa quello del file se lo lasci vuoto)"
              style={inputStyle}
            />
            <input
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              type="text"
              placeholder="Descrizione (facoltativa)"
              style={inputStyle}
            />
            <button onClick={carica} disabled={isPending} className="btn-primary">
              {isPending ? "Caricamento…" : "Carica"}
            </button>
          </div>
        </div>
      )}

      {materiali.length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun documento caricato ancora.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {materiali.map((m) => (
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
