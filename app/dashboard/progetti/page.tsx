import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import ProgettiClient from "./progetti-client";

export default async function ProgettiPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo !== "professore" && profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Progetti</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è per i Professori e il RAD.</p>
      </div>
    );
  }

  const { data: progetti } = await supabase
    .from("progetti_professori")
    .select("*")
    .order("data_scadenza", { ascending: true, nullsFirst: false });

  const { data: membri } = await supabase.from("profiles").select("id, full_name, email, reparto").eq("status", "attivo");

  const conLink = await Promise.all(
    (progetti ?? []).map(async (p) => {
      let bandoUrl: string | null = null;
      if (p.bando_path) {
        const { data } = await supabase.storage.from("progetti-bandi").createSignedUrl(p.bando_path, 60 * 60);
        bandoUrl = data?.signedUrl ?? null;
      }
      return { ...p, bandoUrl };
    })
  );

  return <ProgettiClient progetti={conLink} membri={membri ?? []} nomeProfessore={profile.full_name || profile.email} />;
}
