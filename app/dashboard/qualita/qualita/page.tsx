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

  return (
    <QualitaClient anno={anno} mese={mese} eventi={eventi ?? []} resoconti={resoconti ?? []} />
  );
}
