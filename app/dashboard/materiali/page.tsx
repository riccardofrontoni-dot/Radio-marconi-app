import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import MaterialiClient from "./materiali-client";

export default async function MaterialiPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  const { data: materiali } = await supabase
    .from("materiali")
    .select("*")
    .order("creato_il", { ascending: false });

  const { data: membri } = await supabase.from("profiles").select("id, full_name, email");
  const nomeCaricatore = (id: string | null) => {
    if (!id) return "—";
    const m = (membri ?? []).find((mm) => mm.id === id);
    return m ? (m.full_name || m.email) : "—";
  };

  const conLink = await Promise.all(
    (materiali ?? []).map(async (m) => {
      const { data } = await supabase.storage.from("materiali").createSignedUrl(m.storage_path, 60 * 60);
      return { ...m, url: data?.signedUrl ?? null, nomeCaricatore: nomeCaricatore(m.caricato_da) };
    })
  );

  return (
    <MaterialiClient
      materiali={conLink}
      mioId={profile.id}
      sonoRad={profile.ruolo === "rad"}
      puoCaricare={profile.ruolo === "rad" || profile.ruolo === "professore"}
    />
  );
}
