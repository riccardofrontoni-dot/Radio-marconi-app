import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import EventiClient from "./eventi-client";

export default async function EventiPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  const { data: eventiTutti } = await supabase
    .from("eventi_rad")
    .select("*")
    .order("data_scadenza", { ascending: true, nullsFirst: false });

  const eventi = profile.ruolo === "rad"
    ? (eventiTutti ?? [])
    : (eventiTutti ?? []).filter(
        (e) => (e.persone_coinvolte ?? []).includes(profile.id) || (e.reparti_coinvolti ?? []).includes(profile.reparto ?? "__nessuno__")
      );

  const { data: membri } = await supabase.from("profiles").select("id, full_name, email, reparto").eq("status", "attivo");

  const conLink = await Promise.all(
    eventi.map(async (e) => {
      let documentoUrl: string | null = null;
      if (e.documento_path) {
        const { data } = await supabase.storage.from("eventi-documenti").createSignedUrl(e.documento_path, 60 * 60);
        documentoUrl = data?.signedUrl ?? null;
      }
      return { ...e, documentoUrl };
    })
  );

  return <EventiClient eventi={conLink} membri={membri ?? []} sonoRad={profile.ruolo === "rad"} />;
}
