import { createClient } from "@/lib/supabase/server";
import CalendarioClient from "./calendario-client";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const puoCreare = profile.ruolo === "capo" || profile.ruolo === "rad";

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
  const isSpeaker = profile.reparto === "speaker";
  const isRad = profile.ruolo === "rad";

  return (
    <CalendarioClient
      anno={anno}
      mese={mese}
      inizioGriglia={inizioGriglia.toISOString()}
      fineGriglia={fineGriglia.toISOString()}
      events={events ?? []}
      membri={membri ?? []}
      puoCreare={puoCreare}
      eventiConScript={eventiConScript}
      isSpeaker={isSpeaker}
      isRad={isRad}
      userId={profile.id}
    />
  );
}
