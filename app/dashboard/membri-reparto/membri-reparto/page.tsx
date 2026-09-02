import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import MembriRepartoClient from "./membri-reparto-client";

export default async function MembriRepartoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "capo") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Membri del reparto</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è per i capi reparto.</p>
      </div>
    );
  }

  const { data: membri } = await supabase
    .from("profiles")
    .select("*")
    .eq("reparto", profile.reparto)
    .eq("status", "attivo")
    .order("full_name");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto);

  return <MembriRepartoClient membri={membri ?? []} tasksIniziali={tasks ?? []} reparto={profile.reparto} />;
}
