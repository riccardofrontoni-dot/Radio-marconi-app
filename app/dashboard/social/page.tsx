// app/dashboard/social/page.tsx

import SocialTabs from "@/components/SocialTabs";
import { fetchInstagramData } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";

// Impedisce la generazione statica in fase di build su Vercel
export const dynamic = "force-dynamic";

export default async function SocialPage() {
  // 1. Recupera i dati live da Instagram
  const rawData = await fetchInstagramData();

  // 2. Mappa i dati adattando 'followers' a 'follower' (singolare)
  const instaLive = {
    follower: rawData?.followers ?? 0,
    username: "radiomarconi_",
    latestMedia: null,
    bestMedia: null,
    worstMedia: null,
  };

  // 3. Recupera lo storico da Supabase
  const supabase = createClient();
  const { data: history } = await supabase
    .from("instagram_daily_stats")
    .select("*")
    .order("rilevato_il", { ascending: true });

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111", letterSpacing: "-0.5px" }}>
          Social Analytics
        </h1>
        <p style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
          Monitoraggio delle prestazioni su tutte le piattaforme
        </p>
      </div>

      <SocialTabs instaLive={instaLive} history={history || []} />
    </div>
  );
}