import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Usiamo gli stessi identici parametri che funzionano su /api/instagram
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID || "17841457383389110";
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({ error: "INSTAGRAM_ACCESS_TOKEN mancante" }, { status: 400 });
  }

  try {
    // Stessa chiamata usata con successo in /api/instagram
    const url = `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count&access_token=${accessToken}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    const currentFollowers = data.followers_count;

    // Se per qualsiasi motivo Meta non risponde con i follower corretti (o va in fallback)
    if (currentFollowers === undefined || currentFollowers <= 2) {
      return NextResponse.json({
        skipped: true,
        reason: "Dato da Meta non valido o uguale a 2",
        data_ricevuta: data
      }, { status: 400 });
    }

    // Salvataggio su Supabase
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
      account_id_usato: accountId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({ error: "Errore durante la sincronizzazione" }, { status: 500 });
  }
}