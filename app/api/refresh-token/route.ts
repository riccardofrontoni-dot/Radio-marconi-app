import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const currentToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!appId || !appSecret || !currentToken) {
    return NextResponse.json({ error: "Credenziali mancanti in .env.local" }, { status: 400 });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    // Restituisce il nuovo token con validità estesa di altri 60 giorni
    return NextResponse.json({
      success: true,
      message: "Token rinnovato con successo per altri 60 giorni",
      new_token: data.access_token,
      expires_in_seconds: data.expires_in,
    });
  } catch (error) {
    return NextResponse.json({ error: "Errore durante il rinnovo del token" }, { status: 500 });
  }
}