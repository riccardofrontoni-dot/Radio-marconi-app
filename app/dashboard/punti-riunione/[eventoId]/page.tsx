import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveProfile } from "@/lib/vista";
import { aggiungiPuntoRiunione, togglePuntoRiunione, eliminaPuntoRiunione } from "@/lib/actions";

export default async function PuntiRiunionePage({ params }: { params: { eventoId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getEffectiveProfile(supabase, user!.id);

  const { data: evento } = await supabase
    .from("events")
    .select("id, titolo, quando")
    .eq("id", params.eventoId)
    .maybeSingle();

  if (!evento) {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Riunione non trovata</h2>
        <Link href="/dashboard/calendario" style={{ color: "var(--blue)", fontSize: 13 }}>← Torna al calendario</Link>
      </div>
    );
  }

  if (profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Punti da discutere</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è riservata al RAD.</p>
        <Link href="/dashboard/calendario" style={{ color: "var(--blue)", fontSize: 13 }}>← Torna al calendario</Link>
      </div>
    );
  }

  const { data: punti } = await supabase
    .from("punti_riunione")
    .select("*")
    .eq("evento_id", params.eventoId)
    .order("creato_il", { ascending: true });

  const daDiscutere = (punti ?? []).filter((p) => !p.discusso);
  const discussi = (punti ?? []).filter((p) => p.discusso);

  return (
    <div>
      <Link href="/dashboard/calendario" style={{ color: "var(--gray-text)", fontSize: 12.5, display: "inline-block", marginBottom: 10 }}>
        ← Torna al calendario
      </Link>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>Punti da discutere — {evento.titolo}</h2>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        {new Date(evento.quando).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <form action={aggiungiPuntoRiunione.bind(null, evento.id)} style={{ display: "flex", gap: 8, marginBottom: 24, maxWidth: 560 }}>
        <input
          name="testo"
          type="text"
          required
          placeholder="Es. Rivedere il regolamento pause pubblicitarie"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, fontFamily: "inherit" }}
        />
        <button type="submit" className="btn-primary">Aggiungi</button>
      </form>

      {(punti ?? []).length === 0 && (
        <p className="placeholder-note" style={{ marginTop: 0 }}>Nessun punto ancora aggiunto per questa riunione.</p>
      )}

      {daDiscutere.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 0 }}>Da discutere</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24, maxWidth: 560 }}>
            {daDiscutere.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10 }}>
                <form action={async () => { "use server"; await togglePuntoRiunione(p.id, p.discusso, evento.id); }}>
                  <button type="submit" style={{ width: 17, height: 17, borderRadius: "50%", border: "1.5px solid var(--border)", background: "transparent", cursor: "pointer", padding: 0 }} />
                </form>
                <span style={{ fontSize: 13, flex: 1 }}>{p.testo}</span>
                <form action={async () => { "use server"; await eliminaPuntoRiunione(p.id, evento.id); }}>
                  <button type="submit" style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>Elimina</button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}

      {discussi.length > 0 && (
        <>
          <div className="section-label">Già discussi</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 560 }}>
            {discussi.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10, opacity: 0.6 }}>
                <form action={async () => { "use server"; await togglePuntoRiunione(p.id, p.discusso, evento.id); }}>
                  <button type="submit" style={{ width: 17, height: 17, borderRadius: "50%", border: "none", background: "var(--blue)", cursor: "pointer", padding: 0 }} />
                </form>
                <span style={{ fontSize: 13, flex: 1, textDecoration: "line-through" }}>{p.testo}</span>
                <form action={async () => { "use server"; await eliminaPuntoRiunione(p.id, evento.id); }}>
                  <button type="submit" style={{ border: "none", background: "none", color: "#c22", fontSize: 11.5, cursor: "pointer" }}>Elimina</button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
