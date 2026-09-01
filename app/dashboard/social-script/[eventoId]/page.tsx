import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import SocialScriptClient from "./social-script-client";

export default async function SocialScriptPage({ params }: { params: { eventoId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

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
    .from("social_script")
    .select("*")
    .eq("evento_id", params.eventoId)
    .maybeSingle();

  const { data: blocchi } = script
    ? await supabase.from("social_script_blocchi").select("*").eq("script_id", script.id).order("ordine", { ascending: true })
    : { data: [] as any[] };

  const seiCoinvolto = (evento.membri ?? []).includes(profile.id);
  const puoModificare = profile.ruolo === "rad" || (profile.reparto === "social" && seiCoinvolto);

  return (
    <div>
      <Link href="/dashboard/calendario" style={{ color: "var(--gray-text)", fontSize: 12.5, display: "inline-block", marginBottom: 10 }}>
        ← Torna al calendario
      </Link>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>Script social — {evento.titolo}</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        {new Date(evento.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <SocialScriptClient
        eventoId={evento.id}
        script={script ?? null}
        blocchiIniziali={blocchi ?? []}
        soloLettura={!puoModificare}
      />
    </div>
  );
}
