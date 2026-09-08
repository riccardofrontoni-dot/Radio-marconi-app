import SocialTabs from "@/components/SocialTabs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const supabase = createClient();

  const { data: history } = await supabase
    .from("instagram_daily_stats")
    .select("*")
    .order("rilevato_il", { ascending: true });

  const lastStat = history && history.length > 0 ? history[history.length - 1] : null;

  const instaLive = {
    follower: lastStat?.follower ?? lastStat?.followers ?? 346,
    username: "radiomarconi_",
    latestMedia: null,
    bestMedia: null,
    worstMedia: null,
  };

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