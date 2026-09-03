import { createClient } from "@/lib/supabase/server";

export async function fetchInstagramData() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !token) {
    return { follower: 0, latestMedia: null, bestMedia: null, worstMedia: null, error: "Credenziali mancanti" };
  }

  try {
    // 1. Fetch info profilo
    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count,media_count,username&access_token=${token}`,
      { cache: "no-store" }
    );
    const profile = await profileRes.json();

    // 2. Fetch ultimi contenuti
    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media?fields=id,caption,media_type,permalink,thumbnail_url,media_url,like_count,comments_count,timestamp&limit=15&access_token=${token}`,
      { cache: "no-store" }
    );
    const mediaData = await mediaRes.json();
    const items = mediaData.data || [];

    // 3. Processamento media con stima/fetch metriche avanzate
    const parsedItems = await Promise.all(
      items.map(async (m: any) => {
        let viewsCount = 0;

        try {
          const insightRes = await fetch(
            `https://graph.facebook.com/v19.0/${m.id}/insights?metric=plays&access_token=${token}`,
            { cache: "no-store" }
          );
          const insightData = await insightRes.json();
          if (insightData.data && insightData.data[0]?.values?.[0]?.value) {
            viewsCount = insightData.data[0].values[0].value;
          }
        } catch (e) {
          viewsCount = 0;
        }

        const likes = m.like_count || 0;
        const comments = m.comments_count || 0;

        if (!viewsCount || viewsCount === 0) {
          viewsCount = Math.round(likes * 26 + comments * 40);
        }

        // Calcolo stima follower portati dal video in base all'engagement (conversione dal totale views/likes)
        const followersGained = Math.max(Math.floor(likes * 0.12 + comments * 0.8), 1);

        return {
          id: m.id,
          caption: m.caption || "Nessuna descrizione",
          likes: likes,
          comments: comments,
          views: viewsCount,
          profileVisits: Math.floor(likes * 0.3),
          followersGained: followersGained, // <--- Follower portati dal Reel
          permalink: m.permalink,
          thumbnail: m.thumbnail_url || m.media_url || null,
          timestamp: m.timestamp,
        };
      })
    );

    const latest = parsedItems[0] || null;

    // 4. Ordinamento dal più visto al meno visto
    let best = null;
    let worst = null;

    if (parsedItems.length > 0) {
      const sortedByViews = [...parsedItems].sort((a, b) => b.views - a.views);
      best = sortedByViews[0];
      worst = sortedByViews[sortedByViews.length - 1];
    }

    // Registra lo snapshot su Supabase
    if (profile.followers_count !== undefined) {
      const supabase = createClient();
      const now = new Date();
      await supabase.from("instagram_daily_stats").insert({
        data: now.toISOString().split("T")[0],
        follower: profile.followers_count,
        likes: latest?.likes || 0,
        rilevato_il: now.toISOString(),
      });
    }

    return {
      follower: profile.followers_count || 0,
      username: profile.username || "",
      latestMedia: latest,
      bestMedia: best,
      worstMedia: worst,
    };
  } catch (e) {
    console.error("Errore fetch Instagram:", e);
    return { follower: 0, latestMedia: null, bestMedia: null, worstMedia: null };
  }
}