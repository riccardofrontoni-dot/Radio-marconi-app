import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ScriptClient from "./script-client";

export default async function ScriptPage({ params }: { params: { eventoId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const { data: evento } = await supabase
    .from("events")
    .select("id, titolo, quando, membri")
    .eq("id", params.eventoId)
    .maybeSingle();

  if (!evento) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Script non trovato</h2>
        <Link href="/dashboard/calendario" style={{ color: "var(--blue)", fontSize: 13 }}>← Torna al calendario</Link>
      </div>
    );
  }

  const { data: script } = await supabase
    .from("script_puntata")
    .select("*")
    .eq("evento_id", params.eventoId)
    .maybeSingle();

  const { data: blocchi } = script
    ? await supabase.from("script_blocchi").select("*").eq("script_id", script.id).order("ordine", { ascending: true })
    : { data: [] as any[] };

  const seiCoinvolto = (evento.membri ?? []).includes(profile.id);
  const puoModificare = profile.ruolo === "rad" || (profile.reparto === "speaker" && seiCoinvolto);

  return (
    <div>
      <Link href="/dashboard/calendario" style={{ color: "var(--gray-text)", fontSize: 12.5, display: "inline-block", marginBottom: 10 }}>
        ← Torna al calendario
      </Link>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>Script — {evento.titolo}</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        {new Date(evento.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <ScriptClient
        eventoId={evento.id}
        script={script ?? null}
        blocchiIniziali={blocchi ?? []}
        soloLettura={!puoModificare}
      />
    </div>
  );
}
