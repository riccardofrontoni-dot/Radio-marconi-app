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
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count&access_token=${accessToken}&_t=${Date.now()}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    const currentFollowers = data.followers_count;

    // Filtro di sicurezza: se Meta restituisce un errore o un valore sporco (< 100), non aggiornare Supabase
    if (!currentFollowers || currentFollowers < 100) {
      return NextResponse.json({ 
        warning: "Valore ignorato perché non valido o sotto la soglia minima", 
        valore_ricevuto: currentFollowers ?? null,
        meta_response: data 
      }, { status: 400 });
    }

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

    return NextResponse.json({
      success: true,
      follower_aggiornati: currentFollowers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ error: "Errore durante la sincronizzazione" }, { status: 500 });
  }
}