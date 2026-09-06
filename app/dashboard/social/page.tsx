import { createClient } from "@/lib/supabase/server";
import { fetchInstagramData } from "@/lib/instagram";
import SocialTabs from "@/components/SocialTabs";

export default async function SocialPage() {
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

  // Chiamata API Live a Instagram
  const instaLive = await fetchInstagramData();

  // Fetch dati storici da Supabase
  const { data: history } = await supabase
    .from("instagram_daily_stats")
    .select("*")
    .order("data", { ascending: true });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Social Analytics</h2>
          <p style={{ color: "var(--gray-text)", fontSize: 13, marginTop: 2 }}>
            Monitoraggio delle prestazioni su tutte le piattaforme
          </p>
        </div>
      </div>

      <SocialTabs instaLive={instaLive} history={history || []} />
    </div>
  );
}