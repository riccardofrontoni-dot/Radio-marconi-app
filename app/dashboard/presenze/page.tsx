import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import PresenzeClient from "./presenze-client";

export default async function PresenzePage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "professore" && profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Presenze</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è per i Professori e il RAD.</p>
      </div>
    );
  }

  const today = new Date();
  const [annoParam, meseParam] = (searchParams.mese ?? "").split("-").map(Number);
  const anno = annoParam || today.getFullYear();
  const mese = meseParam ? meseParam - 1 : today.getMonth();
  const inizioMese = new Date(anno, mese, 1);
  const fineMese = new Date(anno, mese + 1, 0, 23, 59, 59);

  const { data: riunioni } = await supabase
    .from("events")
    .select("id, titolo, quando, membri")
    .eq("tipo", "riunione")
    .gte("quando", inizioMese.toISOString())
    .lte("quando", fineMese.toISOString())
    .order("quando", { ascending: false });

  const { data: membri } = await supabase
    .from("profiles")
    .select("id, full_name, email, reparto")
    .eq("status", "attivo");

  const eventIds = (riunioni ?? []).map((r) => r.id);
  const { data: presenze } = eventIds.length
    ? await supabase.from("presenze_riunioni").select("*").in("evento_id", eventIds)
    : { data: [] as { evento_id: string; membro_id: string; presente: boolean }[] };

  return (
    <PresenzeClient
      anno={anno}
      mese={mese}
      riunioni={riunioni ?? []}
      membri={membri ?? []}
      presenzeEsistenti={presenze ?? []}
    />
  );
}
