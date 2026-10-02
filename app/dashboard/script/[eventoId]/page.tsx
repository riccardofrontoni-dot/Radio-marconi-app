import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ScriptClient from "./script-client";

export default async function ScriptPage({ params }: { params: { eventoId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const { data: evento } = await supabase
    .from("events")
    .select("id, titolo, quando, fine, tipo, membri")
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

  // Nomi dei partecipanti per il sottotitolo (es. "12 settembre · 16:00–17:00 · Marco, Giulia").
  const idPartecipanti = evento.membri ?? [];
  const { data: partecipantiProfili } = idPartecipanti.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", idPartecipanti)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const nomiPartecipanti = idPartecipanti
    .map((id: string) => partecipantiProfili?.find((p) => p.id === id))
    .filter(Boolean)
    .map((p: any) => (p!.full_name || p!.email).split(" ")[0]);

  const seiCoinvolto = (evento.membri ?? []).includes(profile.id);
  const puoModificare = profile.ruolo === "rad" || (profile.reparto === "speaker" && seiCoinvolto);

  return (
    <div>
      <Link href="/dashboard/calendario" className="q-back" style={{ display: "inline-block" }}>
        ‹ Torna al calendario
      </Link>

      <ScriptClient
        eventoId={evento.id}
        evento={{ titolo: evento.titolo, quando: evento.quando, fine: evento.fine, tipo: evento.tipo }}
        nomiPartecipanti={nomiPartecipanti}
        script={script ?? null}
        blocchiIniziali={blocchi ?? []}
        soloLettura={!puoModificare}
      />
    </div>
  );
}
