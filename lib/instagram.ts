export async function fetchInstagramData() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    console.error("Variabili Instagram mancanti in process.env");
    return { followers: 0, media_count: 0 };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count&access_token=${accessToken}`;
    
    // Deselezioniamo la cache per avere i follower sempre aggiornati lato server
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data.error) {
      console.error("Errore Graph API Instagram:", data.error.message);
      return { followers: 0, media_count: 0 };
    }

    return {
      followers: data.followers_count || 0,
      media_count: 0,
    };
  } catch (error) {
    console.error("Errore nella fetchInstagramData:", error);
    return { followers: 0, media_count: 0 };
  }
}