export async function fetchInstagramData() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    return { followers: 0, media_count: 0 };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count&access_token=${accessToken}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data.error) {
      return { followers: 0, media_count: 0 };
    }

    return {
      followers: data.followers_count || 0,
      media_count: 0,
    };
  } catch (error) {
    return { followers: 0, media_count: 0 };
  }
}