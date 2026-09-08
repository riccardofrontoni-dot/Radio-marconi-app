import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    return NextResponse.json(
      { error: "Variabili mancanti", accountId: !!accountId, accessToken: !!accessToken },
      { status: 400 }
    );
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${accountId}?fields=username,followers_count&access_token=${accessToken}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    return NextResponse.json({
      VERSIONE_CODICE: "2.0_DEBUG",
      account_usato: accountId,
      risposta_raw_meta: data,
    });
  } catch (error) {
    return NextResponse.json({ error: "Errore chiamata Meta" }, { status: 500 });
  }
}