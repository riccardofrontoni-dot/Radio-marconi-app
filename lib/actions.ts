"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createObiettivo(formData: FormData) {
  const supabase = createClient();
  const tipo = formData.get("tipo") as string;
  const piattaforma = formData.get("piattaforma") as string;
  const target = formData.get("target") as string;
  const scadenza = formData.get("scadenza") as string;
  const progressoManuale = formData.get("progresso_manuale") as string;

  await supabase.from("obiettivi").insert({
    titolo: formData.get("titolo") as string,
    descrizione: (formData.get("descrizione") as string) || null,
    tipo,
    piattaforma: tipo === "social" ? piattaforma || null : null,
    target: target ? Number(target) : null,
    progresso_manuale: tipo === "manuale" && progressoManuale ? Number(progressoManuale) : 0,
    scadenza: scadenza || null,
  });

  revalidatePath("/dashboard/obiettivi");
}

export async function updateObiettivoManuale(id: string, progresso: number) {
  const supabase = createClient();
  await supabase.from("obiettivi").update({ progresso_manuale: progresso }).eq("id", id);
  revalidatePath("/dashboard/obiettivi");
}

export async function deleteObiettivo(id: string) {
  const supabase = createClient();
  await supabase.from("obiettivi").delete().eq("id", id);
  revalidatePath("/dashboard/obiettivi");
}

export async function toggleTask(taskId: string, completato: boolean) {
  const supabase = createClient();
  await supabase.from("tasks").update({ completato: !completato }).eq("id", taskId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/task");
  revalidatePath("/dashboard/gestione");
}

export async function createTask(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("reparto").eq("id", user!.id).single();

  const titolo = formData.get("titolo") as string;
  const assegnatoA = formData.get("assegnato_a") as string;
  const puntataData = formData.get("puntata_data") as string;

  await supabase.from("tasks").insert({
    titolo,
    reparto: profile?.reparto,
    assegnato_a: assegnatoA || null,
    puntata_data: puntataData || null,
  });

  revalidatePath("/dashboard/gestione");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/task");
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/dashboard/gestione");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/task");
}

export async function assignProfile(profileId: string, reparto: string, ruolo: string) {
  const supabase = createClient();
  await supabase
    .from("profiles")
    .update({ reparto, ruolo, status: "attivo" })
    .eq("id", profileId);
  revalidatePath("/dashboard/admin");
}

export async function updateMemberReparto(profileId: string, reparto: string) {
  const supabase = createClient();
  await supabase.from("profiles").update({ reparto }).eq("id", profileId);
  revalidatePath("/dashboard/membri");
  revalidatePath("/dashboard/calendario");
}

export async function createEvent(formData: FormData) {
  const supabase = createClient();

  const titolo = formData.get("titolo") as string;
  const data = formData.get("data") as string; // YYYY-MM-DD
  const ora = formData.get("ora") as string; // HH:MM
  const membri = formData.getAll("membri") as string[];

  const quando = new Date(`${data}T${ora || "00:00"}:00`).toISOString();

  await supabase.from("events").insert({
    titolo,
    quando,
    membri,
  });

  revalidatePath("/dashboard/calendario");
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = createClient();

  const titolo = formData.get("titolo") as string;
  const data = formData.get("data") as string;
  const ora = formData.get("ora") as string;
  const membri = formData.getAll("membri") as string[];

  const quando = new Date(`${data}T${ora || "00:00"}:00`).toISOString();

  await supabase
    .from("events")
    .update({ titolo, quando, membri })
    .eq("id", eventId);

  revalidatePath("/dashboard/calendario");
}

export async function deleteEvent(eventId: string) {
  const supabase = createClient();
  await supabase.from("events").delete().eq("id", eventId);
  revalidatePath("/dashboard/calendario");
}

export async function updateQualityFeedback(reportId: string, formData: FormData) {
  const supabase = createClient();
  await supabase
    .from("quality_reports")
    .update({
      feedback_rad: formData.get("feedback_rad") as string,
      stato: formData.get("stato") as string,
    })
    .eq("id", reportId);
  revalidatePath("/dashboard/resoconti");
}

export async function upsertSocialStats(formData: FormData) {
  const supabase = createClient();
  const piattaforma = formData.get("piattaforma") as string;
  const mese = formData.get("mese") as string; // YYYY-MM
  const follower = Number(formData.get("follower"));
  const views = Number(formData.get("views"));

  await supabase
    .from("social_stats")
    .upsert(
      { piattaforma, mese: `${mese}-01`, follower, views, aggiornato_il: new Date().toISOString() },
      { onConflict: "piattaforma,mese" }
    );
  revalidatePath("/dashboard/social");
}

export async function submitQualityReport(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const eventoId = formData.get("evento_id") as string;

  await supabase.from("quality_reports").insert({
    puntata_titolo: formData.get("puntata_titolo") as string,
    punti_di_forza: formData.get("punti_di_forza") as string,
    criticita: formData.get("criticita") as string,
    voto: Number(formData.get("voto")),
    evento_id: eventoId || null,
    creato_da: user?.id,
  });

  revalidatePath("/dashboard/qualita");
}
