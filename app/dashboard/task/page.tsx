import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import TaskAccordionList from "./task-accordion";
import GestioneTaskCapoClient from "./gestione-task-capo-client";

type Urgenza = "ritardo" | "urgente" | "tranquillo";

function classificaUrgenza(t: { completato: boolean; puntata_data: string | null }): Urgenza | null {
  if (t.completato) return null;
  if (!t.puntata_data) return "tranquillo";
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const scadenza = new Date(t.puntata_data);
  const traDueGiorni = new Date(oggi);
  traDueGiorni.setDate(oggi.getDate() + 2);
  if (scadenza < oggi) return "ritardo";
  if (scadenza <= traDueGiorni) return "urgente";
  return "tranquillo";
}

type EventoDaAssegnare = {
  id: string;
  titolo: string;
  quando: string;
  tipo: string;
  repartoRichiesto: "social" | "speaker";
};

// Eventi "registrazione" senza nessuno del reparto Social tra i membri,
// o eventi "diretta" senza nessuno del reparto Speaker tra i membri.
async function fetchEventiDaAssegnare(
  supabase: ReturnType<typeof createClient>,
  repartiTarget: string[]
): Promise<EventoDaAssegnare[]> {
  if (repartiTarget.length === 0) return [];

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const { data: eventi } = await supabase
    .from("events")
    .select("id, titolo, quando, tipo, membri")
    .in("tipo", ["registrazione", "diretta"])
    .gte("quando", oggi.toISOString())
    .order("quando", { ascending: true });

  const tuttiMembriIds = Array.from(new Set((eventi ?? []).flatMap((e) => e.membri ?? [])));
  const { data: profiliMembri } = tuttiMembriIds.length
    ? await supabase.from("profiles").select("id, reparto").in("id", tuttiMembriIds)
    : { data: [] as { id: string; reparto: string | null }[] };

  const repartoDi = (id: string) => profiliMembri?.find((p) => p.id === id)?.reparto;

  return (eventi ?? [])
    .map((e) => ({
      ...e,
      repartoRichiesto: (e.tipo === "registrazione" ? "social" : "speaker") as "social" | "speaker",
    }))
    .filter((e) => {
      if (!repartiTarget.includes(e.repartoRichiesto)) return false;
      const haGiaQualcuno = (e.membri ?? []).some((id: string) => repartoDi(id) === e.repartoRichiesto);
      return !haGiaQualcuno;
    })
    .map((e) => ({ id: e.id, titolo: e.titolo, quando: e.quando, tipo: e.tipo, repartoRichiesto: e.repartoRichiesto }));
}

export default async function TaskPage({
  searchParams,
}: {
  searchParams: { filtro?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  if (profile.ruolo === "rad") {
    return <VistaRad profile={profile} />;
  }

  if (profile.ruolo === "capo") {
    return <VistaCapo profile={profile} />;
  }

  // Membro: le task assegnate a lui, più quelle assegnate a tutto il reparto (senza persona specifica).
  const { data: tuttiTaskMiei } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto)
    .or(`assegnato_a.eq.${profile.id},assegnato_a.is.null`)
    .order("created_at", { ascending: true });

  const conteggiMiei = { ritardo: 0, urgente: 0, tranquillo: 0 };
  (tuttiTaskMiei ?? []).forEach((t) => {
    const u = classificaUrgenza(t);
    if (u) conteggiMiei[u]++;
  });

  const filtroMio = (searchParams.filtro as Urgenza | undefined) && ["ritardo", "urgente", "tranquillo"].includes(searchParams.filtro!)
    ? (searchParams.filtro as Urgenza)
    : null;
  const tasks = filtroMio
    ? (tuttiTaskMiei ?? []).filter((t) => classificaUrgenza(t) === filtroMio)
    : (tuttiTaskMiei ?? []);

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 20 }}>Task reparto</h2>

      <div className="grid-stack-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        <FiltroCard href="/dashboard/task" label="Tutte" valore={(tuttiTaskMiei ?? []).length} attivo={!filtroMio} colore="var(--dark)" />
        <FiltroCard href="/dashboard/task?filtro=ritardo" label="In ritardo" valore={conteggiMiei.ritardo} attivo={filtroMio === "ritardo"} colore="#DC2626" />
        <FiltroCard href="/dashboard/task?filtro=urgente" label="Urgente" valore={conteggiMiei.urgente} attivo={filtroMio === "urgente"} colore="#D97706" />
        <FiltroCard href="/dashboard/task?filtro=tranquillo" label="Tranquilla" valore={conteggiMiei.tranquillo} attivo={filtroMio === "tranquillo"} colore="var(--blue)" />
      </div>

      <div className="section-label" style={{ marginTop: 0 }}>Le tue task</div>

      <TaskAccordionList
        tasks={tasks ?? []}
        emptyText={filtroMio ? "Nessun task in questa categoria." : "Nessun task ancora assegnato a te."}
      />
    </div>
  );
}

// Capo reparto: "Gestione task" con quattro schede (task da fare, per persona, crea, vista generale) — un solo reparto, il suo.
async function VistaCapo({ profile }: { profile: { id: string; reparto: string } }) {
  const supabase = createClient();

  const { data: membri } = await supabase
    .from("profiles")
    .select("*")
    .eq("reparto", profile.reparto)
    .eq("status", "attivo")
    .order("full_name");

  const { data: tuttiTask } = await supabase
    .from("tasks")
    .select("*")
    .eq("reparto", profile.reparto)
    .order("created_at", { ascending: true });

  const eventiDaAssegnare = await fetchEventiDaAssegnare(supabase, [profile.reparto]);

  return (
    <GestioneTaskCapoClient
      profile={profile}
      membri={membri ?? []}
      tasks={tuttiTask ?? []}
      eventiDaAssegnare={eventiDaAssegnare}
    />
  );
}

// RAD: stessa "Gestione task", ma su tutti i reparti insieme, con un filtro per scegliere.
async function VistaRad({ profile }: { profile: { id: string; reparto: string | null } }) {
  const supabase = createClient();

  const { data: membri } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "attivo")
    .not("reparto", "is", null)
    .order("full_name");

  const { data: tuttiTask } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: capiReparto } = await supabase
    .from("profiles")
    .select("id, full_name, email, ruolo, reparto")
    .eq("status", "attivo")
    .eq("ruolo", "capo")
    .order("reparto");

  const eventiDaAssegnare = await fetchEventiDaAssegnare(supabase, ["social", "speaker"]);

  return (
    <GestioneTaskCapoClient
      profile={profile}
      membri={membri ?? []}
      tasks={tuttiTask ?? []}
      modalitaRad
      capiReparto={capiReparto ?? []}
      eventiDaAssegnare={eventiDaAssegnare}
    />
  );
}

function FiltroCard({ href, label, valore, attivo, colore }: { href: string; label: string; valore: number; attivo: boolean; colore: string }) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        display: "block", textDecoration: "none",
        border: attivo ? `1.5px solid ${colore}` : "1px solid var(--border)",
        background: attivo ? `${colore}0F` : "var(--white)",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", color: colore }}>{valore}</div>
      <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2 }}>{label}</div>
    </Link>
  );
}
