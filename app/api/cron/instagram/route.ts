import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID || "17841457383389110";
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: "INSTAGRAM_ACCESS_TOKEN mancante" }, { status: 400 });
  }

  try {
    // 1. Chiamata live a Meta Graph API (con timestamp per evitare qualsiasi cache)
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count&access_token=${accessToken}&_t=${Date.now()}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (data.followers_count === undefined) {
      return NextResponse.json({ error: "Impossibile recuperare i follower da Meta", details: data }, { status: 400 });
    }

    const currentFollowers = data.followers_count;

    // 2. Connessione a Supabase ed inserimento della nuova misurazione
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: dbError } = await supabase
      .from("instagram_daily_stats")
      .insert({
        follower: currentFollowers,
        rilevato_il: new Date().toISOString()
      });

    if (dbError) {
      return NextResponse.json({ error: "Errore salvataggio Supabase", details: dbError }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        follower_aggiornati: currentFollowers,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate"
        }
      }
    );

  } catch (error) {
    return NextResponse.json({ error: "Errore durante la sincronizzazione" }, { status: 500 });
  }
}