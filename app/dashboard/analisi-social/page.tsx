import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import AnalisiSocialClient from "./analisi-social-client";

export default async function AnalisiSocialPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "rad" && profile.reparto !== "social") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Analisi social</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è per il RAD e il reparto Social.</p>
      </div>
    );
  }

  const { data: contenuti } = await supabase
    .from("contenuti_social")
    .select("*")
    .order("data_pubblicazione", { ascending: false, nullsFirst: false });

  return <AnalisiSocialClient contenuti={contenuti ?? []} />;
}
