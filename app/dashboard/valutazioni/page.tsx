import { createClient } from "@/lib/supabase/server";
import ValutazioniClient from "./valutazioni-client";

export default async function ValutazioniPage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const puoValutare = profile.reparto === "qualita" || profile.ruolo === "rad";
  if (!puoValutare) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Valutazioni</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è visibile solo al reparto qualità e al RAD.</p>
      </div>
    );
  }

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

  const { data: membri } = await supabase
    .from("profiles")
    .select("id, full_name, email, reparto")
    .eq("status", "attivo");

  const eventIds = (eventi ?? []).map((e) => e.id);
  const { data: votiEsistenti } = eventIds.length
    ? await supabase.from("voti_membri").select("*").in("evento_id", eventIds)
    : { data: [] as { evento_id: string; membro_id: string; attitudine: number; professionalita: number; performance: number }[] };

  return (
    <ValutazioniClient
      anno={anno}
      mese={mese}
      eventi={eventi ?? []}
      membri={membri ?? []}
      votiEsistenti={votiEsistenti ?? []}
    />
  );
}
