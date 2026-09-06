import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import EventoRadWorkspaceClient from "./evento-client";

export default async function EventoRadWorkspacePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  const { data: evento } = await supabase.from("eventi_rad").select("*").eq("id", params.id).single();

  if (!evento) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Evento non trovato</h2>
      </div>
    );
  }

  const puoGestire = profile.ruolo === "rad";
  const partecipa =
    puoGestire ||
    (evento.persone_coinvolte ?? []).includes(profile.id) ||
    (evento.reparti_coinvolti ?? []).includes(profile.reparto ?? "__nessuno__");

  if (!partecipa) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>{evento.nome}</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Non fai parte di questo evento.</p>
      </div>
    );
  }

  const [
    { data: tasks },
    { data: materiali },
    { data: compiti },
    { data: obiettivi },
    { data: eventiCalendario },
    { data: membriTutti },
  ] = await Promise.all([
    supabase.from("tasks").select("*").eq("rad_evento_id", params.id).order("creato_il", { ascending: false }),
    supabase.from("materiali").select("*").eq("rad_evento_id", params.id).order("creato_il", { ascending: false }),
    supabase.from("evento_rad_compiti").select("*").eq("rad_evento_id", params.id),
    supabase.from("evento_rad_obiettivi").select("*").eq("rad_evento_id", params.id).order("scadenza", { ascending: true }),
    supabase.from("events").select("*").eq("rad_evento_id", params.id).order("quando", { ascending: true }),
    supabase.from("profiles").select("id, full_name, email, reparto").eq("status", "attivo"),
  ]);

  const idPartecipanti = new Set<string>(evento.persone_coinvolte ?? []);
  (membriTutti ?? []).forEach((m) => {
    if (m.reparto && (evento.reparti_coinvolti ?? []).includes(m.reparto)) idPartecipanti.add(m.id);
  });
  const partecipanti = (membriTutti ?? []).filter((m) => idPartecipanti.has(m.id));

  const materialiConLink = await Promise.all(
    (materiali ?? []).map(async (m) => {
      const { data } = await supabase.storage.from("materiali").createSignedUrl(m.storage_path, 60 * 60);
      return { ...m, url: data?.signedUrl ?? null };
    })
  );

  const documentoUrl = evento.documento_path
    ? (await supabase.storage.from("eventi-documenti").createSignedUrl(evento.documento_path, 60 * 60)).data?.signedUrl ?? null
    : null;

  const taskCompletate = (tasks ?? []).filter((t) => t.completato).length;
  const andamento = (tasks ?? []).length ? Math.round((taskCompletate / (tasks ?? []).length) * 100) : 0;

  return (
    <EventoRadWorkspaceClient
      evento={{ ...evento, documentoUrl }}
      tasks={tasks ?? []}
      materiali={materialiConLink}
      compiti={compiti ?? []}
      obiettivi={obiettivi ?? []}
      eventiCalendario={eventiCalendario ?? []}
      partecipanti={partecipanti}
      membriTutti={membriTutti ?? []}
      andamento={andamento}
      puoGestire={puoGestire}
      mioId={profile.id}
    />
  );
}
