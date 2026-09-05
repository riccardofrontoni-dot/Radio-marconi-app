import { createClient } from "@/lib/supabase/server";
import QualitaClient from "./qualita-client";

export default async function QualitaPage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();

  const today = new Date();
  const [annoParam, meseParam] = (searchParams.mese ?? "").split("-").map(Number);
  const anno = annoParam || today.getFullYear();
  const mese = meseParam ? meseParam - 1 : today.getMonth();
  const inizioMese = new Date(anno, mese, 1);
  const fineMese = new Date(anno, mese + 1, 0, 23, 59, 59);

  const { data: eventi } = await supabase
    .from("events")
    .select("*")
    .in("tipo", ["diretta", "riunione"])
    .gte("quando", inizioMese.toISOString())
    .lte("quando", fineMese.toISOString())
    .order("quando", { ascending: false });

  const eventIds = (eventi ?? []).map((e) => e.id);
  const { data: resoconti } = eventIds.length
    ? await supabase.from("quality_reports").select("*").in("evento_id", eventIds)
    : { data: [] as any[] };

  const { data: criteri } = await supabase.from("criteri_qualita").select("*").eq("attivo", true).order("ordine");

  const { data: valutazioniCriteri } = eventIds.length
    ? await supabase.from("quality_report_criteri").select("*").in("evento_id", eventIds)
    : { data: [] as any[] };

  const { data: membri } = await supabase.from("profiles").select("id, full_name, email, reparto").eq("status", "attivo");

  // Criticità/da migliorare ancora aperte (task collegata non completata), su tutte le puntate — non solo il mese in corso.
  const { data: tutteValutazioni } = await supabase
    .from("quality_report_criteri")
    .select("*, tasks(stato, titolo), events(titolo, quando)")
    .neq("classificazione", "ok")
    .not("task_id", "is", null);
  const aperte = (tutteValutazioni ?? []).filter((v: any) => v.tasks && v.tasks.stato !== "completata");

  return (
    <QualitaClient
      anno={anno}
      mese={mese}
      eventi={eventi ?? []}
      resoconti={resoconti ?? []}
      criteri={criteri ?? []}
      valutazioniCriteri={valutazioniCriteri ?? []}
      membri={membri ?? []}
      aperte={aperte}
    />
  );
}
