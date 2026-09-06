import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import ProgettoWorkspaceClient from "./progetto-client";

export default async function ProgettoWorkspacePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  const { data: progetto } = await supabase.from("progetti_professori").select("*").eq("id", params.id).single();

  if (!progetto) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Progetto non trovato</h2>
      </div>
    );
  }

  const puoGestire = profile.ruolo === "rad" || profile.ruolo === "professore";
  const partecipa =
    puoGestire ||
    (progetto.persone_coinvolte ?? []).includes(profile.id) ||
    (progetto.reparti_coinvolti ?? []).includes(profile.reparto ?? "__nessuno__");

  if (!partecipa) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>{progetto.nome}</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Non fai parte di questo progetto.</p>
      </div>
    );
  }

  const [
    { data: tasks },
    { data: materiali },
    { data: compiti },
    { data: obiettivi },
    { data: eventi },
    { data: membriTutti },
  ] = await Promise.all([
    supabase.from("tasks").select("*").eq("progetto_id", params.id).order("creato_il", { ascending: false }),
    supabase.from("materiali").select("*").eq("progetto_id", params.id).order("creato_il", { ascending: false }),
    supabase.from("progetto_compiti").select("*").eq("progetto_id", params.id),
    supabase.from("progetto_obiettivi").select("*").eq("progetto_id", params.id).order("scadenza", { ascending: true }),
    supabase.from("events").select("*").eq("progetto_id", params.id).order("quando", { ascending: true }),
    supabase.from("profiles").select("id, full_name, email, reparto").eq("status", "attivo"),
  ]);

  const idPartecipanti = new Set<string>(progetto.persone_coinvolte ?? []);
  (membriTutti ?? []).forEach((m) => {
    if (m.reparto && (progetto.reparti_coinvolti ?? []).includes(m.reparto)) idPartecipanti.add(m.id);
  });
  const partecipanti = (membriTutti ?? []).filter((m) => idPartecipanti.has(m.id));

  const materialiConLink = await Promise.all(
    (materiali ?? []).map(async (m) => {
      const { data } = await supabase.storage.from("materiali").createSignedUrl(m.storage_path, 60 * 60);
      return { ...m, url: data?.signedUrl ?? null };
    })
  );

  const bandoUrl = progetto.bando_path
    ? (await supabase.storage.from("progetti-bandi").createSignedUrl(progetto.bando_path, 60 * 60)).data?.signedUrl ?? null
    : null;

  const taskCompletate = (tasks ?? []).filter((t) => t.completato).length;
  const andamento = (tasks ?? []).length ? Math.round((taskCompletate / (tasks ?? []).length) * 100) : 0;

  return (
    <ProgettoWorkspaceClient
      progetto={{ ...progetto, bandoUrl }}
      tasks={tasks ?? []}
      materiali={materialiConLink}
      compiti={compiti ?? []}
      obiettivi={obiettivi ?? []}
      eventi={eventi ?? []}
      partecipanti={partecipanti}
      andamento={andamento}
      puoGestire={puoGestire}
      mioId={profile.id}
    />
  );
}
