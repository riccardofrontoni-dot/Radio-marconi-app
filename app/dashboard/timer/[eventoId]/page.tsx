import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TimerClient from "./timer-client";

export default async function TimerPage({ params }: { params: { eventoId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const { data: evento } = await supabase
    .from("events")
    .select("id, titolo, quando, tipo, membri")
    .eq("id", params.eventoId)
    .maybeSingle();

  if (!evento) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Diretta non trovata</h2>
        <Link href="/dashboard/calendario" style={{ color: "var(--blue)", fontSize: 13 }}>← Torna al calendario</Link>
      </div>
    );
  }

  const seiCoinvolto = (evento.membri ?? []).includes(profile.id);
  const puoUsareTimer = profile.ruolo === "rad" || (profile.reparto === "speaker" && seiCoinvolto);

  if (!puoUsareTimer) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Timer diretta</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Il timer è disponibile solo per lo speaker assegnato a questa diretta.</p>
        <Link href="/dashboard/calendario" style={{ color: "var(--blue)", fontSize: 13 }}>← Torna al calendario</Link>
      </div>
    );
  }

  const { data: script } = await supabase
    .from("script_puntata")
    .select("*")
    .eq("evento_id", params.eventoId)
    .maybeSingle();

  if (!script) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Timer diretta</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14, marginBottom: 14 }}>
          Serve prima uno script con i blocchi e le durate, altrimenti il timer non sa cosa cronometrare.
        </p>
        <Link href={`/dashboard/script/${evento.id}`} style={{ color: "var(--blue)", fontSize: 13, fontWeight: 600 }}>+ Scrivi lo script</Link>
      </div>
    );
  }

  const { data: blocchi } = await supabase
    .from("script_blocchi")
    .select("*")
    .eq("script_id", script.id)
    .order("ordine", { ascending: true });

  const { data: sessioneEsistente } = await supabase
    .from("timer_sessioni")
    .select("*")
    .eq("evento_id", params.eventoId)
    .eq("membro_id", profile.id)
    .maybeSingle();

  return (
    <div>
      <Link href="/dashboard/calendario" style={{ color: "var(--gray-text)", fontSize: 12.5, display: "inline-block", marginBottom: 10 }}>
        ← Torna al calendario
      </Link>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>Timer — {evento.titolo}</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        {new Date(evento.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <TimerClient
        eventoId={evento.id}
        blocchi={(blocchi ?? []).map((b) => ({ nome: b.nome ?? "Blocco", durata_minuti: b.durata_minuti }))}
        sessioneEsistente={sessioneEsistente ?? null}
      />
    </div>
  );
}
