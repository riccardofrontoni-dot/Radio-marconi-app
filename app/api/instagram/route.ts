import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    return NextResponse.json(
      { error: "Variabili INSTAGRAM_ACCOUNT_ID o INSTAGRAM_ACCESS_TOKEN mancanti" },
      { status: 400 }
    );
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count&access_token=${accessToken}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({
      followers: data.followers_count,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Errore durante la chiamata a Instagram" },
      { status: 500 }
    );
  }
}