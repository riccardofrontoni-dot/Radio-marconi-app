// app/dashboard/analisi-social/page.tsx

import SocialTabs from "@/components/SocialTabs";
import { fetchInstagramData } from "@/lib/instagram";
import { createClient } from "@/lib/supabase/server";

export default async function AnalisiSocialPage() {
  // 1. Chiama le API live di Instagram (recupera follower reali e media)
  const instaLive = await fetchInstagramData();

  // 2. Recupera lo storico dei follower dal database Supabase per il grafico
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

      {/* Passa i dati reali a SocialTabs */}
      <SocialTabs instaLive={instaLive} history={history || []} />
    </div>
  );
}