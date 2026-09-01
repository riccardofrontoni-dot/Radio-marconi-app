import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recupera il profilo dell'utente loggato. Se è un RAD e ha impostato una
 * "vista di prova" (cookie), restituisce il profilo con reparto/ruolo
 * sovrascritti per quella pagina — senza toccare il database. L'id resta
 * quello vero, quindi le query legate a "task assegnati a me" ecc.
 * continuano a fare riferimento al vero account del RAD.
 */
export async function getEffectiveProfile(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile || profile.ruolo !== "rad") return profile;

  const store = cookies();
  const vista = store.get("vista_rad")?.value; // formato "reparto:ruolo", es. "speaker:membro"
  if (!vista || vista === "rad") return profile;

  const [reparto, ruolo] = vista.split(":");
  if (!reparto || !ruolo) return profile;

  return { ...profile, reparto, ruolo, vistaAttiva: true };
}
