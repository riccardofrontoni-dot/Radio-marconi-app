import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import CalendarioClient from "./calendario-client";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);
  const puoCreare = profile.ruolo === "capo" || profile.ruolo === "rad" || profile.ruolo === "professore";

  const today = new Date();
  const [annoParam, meseParam] = (searchParams.mese ?? "").split("-").map(Number);
  const anno = annoParam || today.getFullYear();
  const mese = meseParam ? meseParam - 1 : today.getMonth();

  const primoDelMese = new Date(anno, mese, 1);
  const ultimoDelMese = new Date(anno, mese + 1, 0);
  const primoGiornoSettimana = (primoDelMese.getDay() + 6) % 7;
  const inizioGriglia = new Date(anno, mese, 1 - primoGiornoSettimana);
  const ultimoGiornoSettimana = (ultimoDelMese.getDay() + 6) % 7;
  const fineGriglia = new Date(anno, mese, ultimoDelMese.getDate() + (6 - ultimoGiornoSettimana));

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .gte("quando", inizioGriglia.toISOString())
    .lte("quando", fineGriglia.toISOString())
    .order("quando", { ascending: true });

  const { data: membri } = await supabase
    .from("profiles")
    .select("id, full_name, email, reparto")
    .eq("status", "attivo")
    .order("full_name");

  const eventIds = (events ?? []).map((e) => e.id);
  const { data: scriptEsistenti } = eventIds.length
    ? await supabase.from("script_puntata").select("evento_id").in("evento_id", eventIds)
    : { data: [] as { evento_id: string }[] };
  const eventiConScript = (scriptEsistenti ?? []).map((s) => s.evento_id);

  const { data: scriptSocialEsistenti } = eventIds.length
    ? await supabase.from("social_script").select("evento_id").in("evento_id", eventIds)
    : { data: [] as { evento_id: string }[] };
  const eventiConScriptSocial = (scriptSocialEsistenti ?? []).map((s) => s.evento_id);

  const isSpeaker = profile.reparto === "speaker";
  const isSocial = profile.reparto === "social";
  const isRad = profile.ruolo === "rad";

  const { data: formats } = await supabase.from("format_diretta").select("*").eq("reparto", "speaker").order("nome");

  const { data: materialiFormazione } = eventIds.length
    ? await supabase.from("materiali").select("evento_id, storage_path, nome").eq("categoria", "formazione").in("evento_id", eventIds)
    : { data: [] as { evento_id: string; storage_path: string; nome: string }[] };
  const materialePerEvento: Record<string, { url: string | null; nome: string }> = {};
  for (const m of materialiFormazione ?? []) {
    if (!m.evento_id) continue;
    const { data } = await supabase.storage.from("materiali").createSignedUrl(m.storage_path, 60 * 60);
    materialePerEvento[m.evento_id] = { url: data?.signedUrl ?? null, nome: m.nome };
  }

  return (
    <CalendarioClient
      anno={anno}
      mese={mese}
      inizioGriglia={inizioGriglia.toISOString()}
      fineGriglia={fineGriglia.toISOString()}
      events={events ?? []}
      membri={membri ?? []}
      formats={formats ?? []}
      materialePerEvento={materialePerEvento}
      puoCreare={puoCreare}
      eventiConScript={eventiConScript}
      eventiConScriptSocial={eventiConScriptSocial}
      isSpeaker={isSpeaker}
      isSocial={isSocial}
      isRad={isRad}
      userId={profile.id}
    />
  );
}
