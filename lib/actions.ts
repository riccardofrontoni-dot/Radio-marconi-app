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

export async function salvaTimerSessione(eventoId: string, dettaglio: { nome: string; pianificato_sec: number; effettivo_sec: number }[], precisione: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("timer_sessioni").upsert(
    { evento_id: eventoId, membro_id: user.id, dettaglio, precisione },
    { onConflict: "evento_id,membro_id" }
  );

  revalidatePath(`/dashboard/timer/${eventoId}`);
  revalidatePath("/dashboard/calendario");
}

export async function saveScript(eventoId: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const titolo = formData.get("titolo") as string;
  const materiale = formData.get("materiale") as string;
  const descrizioneBreve = formData.get("descrizione_breve") as string;

  const { data: esistente } = await supabase
    .from("script_puntata")
    .select("id")
    .eq("evento_id", eventoId)
    .maybeSingle();

  let scriptId: string;
  if (esistente) {
    scriptId = esistente.id;
    await supabase
      .from("script_puntata")
      .update({ titolo, materiale, descrizione_breve: descrizioneBreve, aggiornato_il: new Date().toISOString() })
      .eq("id", scriptId);
    await supabase.from("script_blocchi").delete().eq("script_id", scriptId);
  } else {
    const { data: nuovo } = await supabase
      .from("script_puntata")
      .insert({ evento_id: eventoId, titolo, materiale, descrizione_breve: descrizioneBreve, creato_da: user?.id })
      .select("id")
      .single();
    scriptId = nuovo!.id;
  }

  const tipi = formData.getAll("blocco_tipo") as string[];
  const nomi = formData.getAll("blocco_nome") as string[];
  const sottotitoli = formData.getAll("blocco_sottotitolo") as string[];
  const materiali = formData.getAll("blocco_materiale") as string[];
  const punti = formData.getAll("blocco_punti") as string[];
  const durate = formData.getAll("blocco_durata") as string[];

  const righe = tipi.map((tipo, i) => ({
    script_id: scriptId,
    ordine: i,
    tipo,
    nome: nomi[i] || null,
    sottotitolo: sottotitoli[i] || null,
    materiale: materiali[i] || null,
    punti: punti[i] || null,
    durata_minuti: Number(durate[i]) || 0,
  }));

  if (righe.length > 0) {
    await supabase.from("script_blocchi").insert(righe);
  }

  revalidatePath(`/dashboard/script/${eventoId}`);
  revalidatePath("/dashboard/calendario");
}

export async function deleteScript(scriptId: string, eventoId: string) {
  const supabase = createClient();
  await supabase.from("script_puntata").delete().eq("id", scriptId);
  revalidatePath(`/dashboard/script/${eventoId}`);
  revalidatePath("/dashboard/calendario");
}

export async function toggleTask(taskId: string, completato: boolean) {
  const supabase = createClient();
  await supabase.from("tasks").update({ completato: !completato }).eq("id", taskId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/task");
  revalidatePath("/dashboard/gestione");
  revalidatePath("/dashboard/membri-reparto");
}

export async function createTask(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("reparto").eq("id", user!.id).single();

  const titolo = formData.get("titolo") as string;
  const assegnatoA = formData.get("assegnato_a") as string;
  const puntataData = formData.get("puntata_data") as string;
  const descrizione = formData.get("descrizione") as string;

  await supabase.from("tasks").insert({
    titolo,
    reparto: profile?.reparto,
    assegnato_a: assegnatoA || null,
    puntata_data: puntataData || null,
    descrizione: descrizione || null,
  });

  if (assegnatoA) {
    await supabase.from("avvisi").insert({
      destinatario_id: assegnatoA,
      testo: `Nuova task assegnata: "${titolo}"`,
      creato_da: user?.id,
    });
  }

  revalidatePath("/dashboard/gestione");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/task");
  revalidatePath("/dashboard/membri-reparto");
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/dashboard/gestione");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/task");
  revalidatePath("/dashboard/membri-reparto");
}

export async function assignProfile(profileId: string, reparto: string, ruolo: string) {
  const supabase = createClient();
  await supabase
    .from("profiles")
    .update({ reparto: reparto || null, ruolo, status: "attivo" })
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
  const oraFine = formData.get("ora_fine") as string; // HH:MM
  const tipo = (formData.get("tipo") as string) || "diretta";
  const membri = formData.getAll("membri") as string[];
  const descrizione = formData.get("descrizione") as string;

  const quando = new Date(`${data}T${ora || "00:00"}:00`).toISOString();
  const fine = oraFine ? new Date(`${data}T${oraFine}:00`).toISOString() : null;

  await supabase.from("events").insert({
    titolo,
    quando,
    fine,
    tipo,
    membri,
    descrizione: descrizione || null,
  });

  revalidatePath("/dashboard/calendario");
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = createClient();

  const titolo = formData.get("titolo") as string;
  const data = formData.get("data") as string;
  const ora = formData.get("ora") as string;
  const oraFine = formData.get("ora_fine") as string;
  const tipo = (formData.get("tipo") as string) || "diretta";
  const membri = formData.getAll("membri") as string[];
  const descrizione = formData.get("descrizione") as string;

  const quando = new Date(`${data}T${ora || "00:00"}:00`).toISOString();
  const fine = oraFine ? new Date(`${data}T${oraFine}:00`).toISOString() : null;

  await supabase
    .from("events")
    .update({ titolo, quando, fine, tipo, membri, descrizione: descrizione || null })
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

export async function salvaVotiEvento(eventoId: string, membriIds: string[], formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const righe = membriIds.map((membroId) => ({
    evento_id: eventoId,
    membro_id: membroId,
    attitudine: Number(formData.get(`attitudine_${membroId}`)),
    professionalita: Number(formData.get(`professionalita_${membroId}`)),
    performance: Number(formData.get(`performance_${membroId}`)),
    votato_da: user?.id,
    aggiornato_il: new Date().toISOString(),
  }));

  await supabase.from("voti_membri").upsert(righe, { onConflict: "evento_id,membro_id" });

  revalidatePath("/dashboard/valutazioni");
  revalidatePath("/dashboard/analisi");
  revalidatePath("/dashboard/obiettivi");
}

export async function upsertQualityReport(eventoId: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("quality_reports").upsert(
    {
      evento_id: eventoId,
      puntata_titolo: formData.get("puntata_titolo") as string,
      punti_di_forza: formData.get("punti_di_forza") as string,
      criticita: formData.get("criticita") as string,
      voto: Number(formData.get("voto")),
      creato_da: user?.id,
      stato: "in_revisione", // ogni modifica torna in revisione per il RAD
    },
    { onConflict: "evento_id" }
  );

  revalidatePath("/dashboard/qualita");
  revalidatePath("/dashboard/resoconti");
}

export async function impostaVistaRad(valore: string) {
  const { cookies } = await import("next/headers");
  const store = cookies();
  if (valore === "rad") {
    store.delete("vista_rad");
  } else {
    store.set("vista_rad", valore, { path: "/", maxAge: 60 * 60 * 24 });
  }
  revalidatePath("/dashboard", "layout");
}

export async function aggiungiPuntoRiunione(eventoId: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const testo = formData.get("testo") as string;
  if (!testo) return;

  await supabase.from("punti_riunione").insert({ evento_id: eventoId, testo, creato_da: user?.id });

  revalidatePath(`/dashboard/punti-riunione/${eventoId}`);
  revalidatePath("/dashboard/calendario");
}

export async function togglePuntoRiunione(id: string, discusso: boolean, eventoId: string) {
  const supabase = createClient();
  await supabase.from("punti_riunione").update({ discusso: !discusso }).eq("id", id);
  revalidatePath(`/dashboard/punti-riunione/${eventoId}`);
}

export async function eliminaPuntoRiunione(id: string, eventoId: string) {
  const supabase = createClient();
  await supabase.from("punti_riunione").delete().eq("id", id);
  revalidatePath(`/dashboard/punti-riunione/${eventoId}`);
  revalidatePath("/dashboard/calendario");
}

export async function inviaAvviso(destinatarioId: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const testo = formData.get("testo") as string;
  if (!testo) return;

  await supabase.from("avvisi").insert({ destinatario_id: destinatarioId, testo, creato_da: user?.id });

  revalidatePath("/dashboard/membri-reparto");
  revalidatePath("/dashboard");
}

export async function segnaAvvisoLetto(id: string) {
  const supabase = createClient();
  await supabase.from("avvisi").update({ letto: true }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function saveSocialScript(eventoId: string, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const titolo = formData.get("titolo") as string;

  const { data: esistente } = await supabase
    .from("social_script")
    .select("id")
    .eq("evento_id", eventoId)
    .maybeSingle();

  let scriptId: string;
  if (esistente) {
    scriptId = esistente.id;
    await supabase
      .from("social_script")
      .update({ titolo, aggiornato_il: new Date().toISOString() })
      .eq("id", scriptId);
    await supabase.from("social_script_blocchi").delete().eq("script_id", scriptId);
  } else {
    const { data: nuovo } = await supabase
      .from("social_script")
      .insert({ evento_id: eventoId, titolo, creato_da: user?.id })
      .select("id")
      .single();
    scriptId = nuovo!.id;
  }

  const titoli = formData.getAll("blocco_titolo") as string[];
  const tipi = formData.getAll("blocco_tipo") as string[];
  const ganci = formData.getAll("blocco_gancio") as string[];
  const link = formData.getAll("blocco_link") as string[];
  const corpi = formData.getAll("blocco_corpo") as string[];
  const cta = formData.getAll("blocco_cta") as string[];

  const righe = titoli.map((titoloBlocco, i) => ({
    script_id: scriptId,
    ordine: i,
    titolo: titoloBlocco || null,
    tipo: tipi[i] || "format",
    gancio: ganci[i] || null,
    link: link[i] || null,
    corpo: corpi[i] || null,
    cta: cta[i] || null,
  }));

  if (righe.length > 0) {
    await supabase.from("social_script_blocchi").insert(righe);
  }

  revalidatePath(`/dashboard/social-script/${eventoId}`);
  revalidatePath("/dashboard/calendario");
}

export async function deleteSocialScript(scriptId: string, eventoId: string) {
  const supabase = createClient();
  await supabase.from("social_script").delete().eq("id", scriptId);
  revalidatePath(`/dashboard/social-script/${eventoId}`);
  revalidatePath("/dashboard/calendario");
}

export async function impostaStatoTask(taskId: string, stato: "da_fare" | "in_corso" | "completata") {
  const supabase = createClient();
  await supabase.from("tasks").update({ stato, completato: stato === "completata" }).eq("id", taskId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/task");
  revalidatePath("/dashboard/gestione");
  revalidatePath("/dashboard/membri-reparto");
}

export async function assegnaTaskRad(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const titolo = formData.get("titolo") as string;
  const reparto = formData.get("reparto") as string;
  const assegnatoA = formData.get("assegnato_a") as string;
  const descrizione = formData.get("descrizione") as string;

  await supabase.from("tasks").insert({
    titolo,
    reparto,
    assegnato_a: assegnatoA || null,
    descrizione: descrizione || null,
  });

  if (assegnatoA) {
    await supabase.from("avvisi").insert({
      destinatario_id: assegnatoA,
      testo: `Nuova task assegnata: "${titolo}"`,
      creato_da: user?.id,
    });
  } else {
    const { data: membriReparto } = await supabase.from("profiles").select("id").eq("reparto", reparto).eq("status", "attivo");
    if (membriReparto && membriReparto.length > 0) {
      await supabase.from("avvisi").insert(
        membriReparto.map((m) => ({
          destinatario_id: m.id,
          testo: `Nuova task per il reparto: "${titolo}"`,
          creato_da: user?.id,
        }))
      );
    }
  }

  revalidatePath("/dashboard/task");
  revalidatePath("/dashboard");
}

export async function impostaPresenza(eventoId: string, membroId: string, presente: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("presenze_riunioni").upsert(
    { evento_id: eventoId, membro_id: membroId, presente, registrato_da: user?.id, aggiornato_il: new Date().toISOString() },
    { onConflict: "evento_id,membro_id" }
  );

  revalidatePath("/dashboard/presenze");
  revalidatePath("/dashboard/analisi");
}

export async function creaContenutoSocial(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("contenuti_social").insert({
    nome: formData.get("nome") as string,
    tipologia: (formData.get("tipologia") as string) || "format",
    data_pubblicazione: (formData.get("data_pubblicazione") as string) || null,
    visualizzazioni: Number(formData.get("visualizzazioni")) || 0,
    engagement: Number(formData.get("engagement")) || 0,
    retention_rate: Number(formData.get("retention_rate")) || 0,
    follower_acquisiti: Number(formData.get("follower_acquisiti")) || 0,
    creato_da: user?.id,
  });

  revalidatePath("/dashboard/analisi-social");
}

export async function eliminaContenutoSocial(id: string) {
  const supabase = createClient();
  await supabase.from("contenuti_social").delete().eq("id", id);
  revalidatePath("/dashboard/analisi-social");
}
