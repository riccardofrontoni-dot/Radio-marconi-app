import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { upsertSocialStats } from "@/lib/actions";

const PIATTAFORME = [
  { value: "instagram", label: "Instagram", color: "#E1306C" },
  { value: "tiktok", label: "TikTok", color: "#000000" },
  { value: "facebook", label: "Facebook", color: "#1877F2" },
];

const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export default async function SocialPage({
  searchParams,
}: {
  searchParams: { mese?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (profile.ruolo !== "rad") {
    return (
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>Social</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14 }}>Questa sezione è visibile solo al RAD.</p>
      </div>
    );
  }

  const today = new Date();
  const [annoParam, meseParam] = (searchParams.mese ?? "").split("-").map(Number);
  const anno = annoParam || today.getFullYear();
  const mese = meseParam ? meseParam - 1 : today.getMonth();
  const meseStr = `${anno}-${String(mese + 1).padStart(2, "0")}`;
  const meseISO = `${meseStr}-01`;

  const { data: stats } = await supabase.from("social_stats").select("*").eq("mese", meseISO);
  const statByPlatform = (v: string) => (stats ?? []).find((s) => s.piattaforma === v);

  const totFollower = (stats ?? []).reduce((a, s) => a + s.follower, 0);
  const totViews = (stats ?? []).reduce((a, s) => a + s.views, 0);

  const meseKey = (a: number, m: number) => `${a}-${String(m + 1).padStart(2, "0")}`;
  const mesePrec = mese === 0 ? meseKey(anno - 1, 11) : meseKey(anno, mese - 1);
  const meseSucc = mese === 11 ? meseKey(anno + 1, 0) : meseKey(anno, mese + 1);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22 }}>Social</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/dashboard/social?mese=${mesePrec}`} style={navBtnStyle}>‹</Link>
          <span style={{ fontSize: 13.5, fontWeight: 600, minWidth: 110, textAlign: "center" }}>{MESI[mese]} {anno}</span>
          <Link href={`/dashboard/social?mese=${meseSucc}`} style={navBtnStyle}>›</Link>
        </div>
      </div>
      <p style={{ color: "var(--gray-text)", fontSize: 13, marginBottom: 24 }}>
        Numeri inseriti a mano per ora — pronti per essere collegati a un'API vera più avanti.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 30 }}>
        <div className="card" style={{ background: "var(--dark)" }}>
          <div style={{ fontSize: 11.5, color: "#a1a1a6", marginBottom: 6 }}>Totale follower</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", color: "#fff" }}>{totFollower.toLocaleString("it-IT")}</div>
        </div>
        <div className="card" style={{ background: "var(--dark)" }}>
          <div style={{ fontSize: 11.5, color: "#a1a1a6", marginBottom: 6 }}>Totale views</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif", color: "#fff" }}>{totViews.toLocaleString("it-IT")}</div>
        </div>
        {PIATTAFORME.slice(0, 2).map((p) => {
          const s = statByPlatform(p.value);
          return (
            <div key={p.value} className="card">
              <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginBottom: 6 }}>{p.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif" }}>{(s?.follower ?? 0).toLocaleString("it-IT")}</div>
              <div style={{ fontSize: 10.5, color: "var(--gray-text)" }}>follower</div>
            </div>
          );
        })}
      </div>

      <div className="section-label" style={{ marginTop: 0 }}>Aggiorna i numeri</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {PIATTAFORME.map((p) => {
          const s = statByPlatform(p.value);
          return (
            <form
              key={p.value}
              action={upsertSocialStats}
              style={{ background: "var(--light-bg)", borderRadius: 14, padding: 16, display: "grid", gap: 10 }}
            >
              <input type="hidden" name="piattaforma" value={p.value} />
              <input type="hidden" name="mese" value={meseStr} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.label}</span>
              </div>
              <div>
                <label style={labelStyle}>Follower</label>
                <input type="number" name="follower" min={0} defaultValue={s?.follower ?? 0} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Views (mese)</label>
                <input type="number" name="views" min={0} defaultValue={s?.views ?? 0} style={inputStyle} />
              </div>
              <button type="submit" className="btn-primary" style={{ fontSize: 12.5, padding: "8px 14px" }}>Salva</button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontSize: 16, color: "var(--dark)", padding: "3px 10px", borderRadius: 7, background: "var(--light-bg)",
};
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)",
  fontSize: 13, fontFamily: "inherit", background: "var(--white)",
};
