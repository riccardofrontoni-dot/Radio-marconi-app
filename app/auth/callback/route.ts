import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google reindirizza qui dopo il login. Scambiamo il "code" per una
// sessione vera, poi controlliamo che l'email sia davvero della scuola
// (il parametro hd in fase di login è solo un filtro visivo, non una
// garanzia — questo controllo lato server è quello che conta).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const schoolDomain = process.env.NEXT_PUBLIC_SCHOOL_EMAIL_DOMAIN;

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email ?? "";
      const isSchoolAccount = schoolDomain ? email.endsWith(`@${schoolDomain}`) : true;

      if (!isSchoolAccount) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?errore=dominio_non_valido`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?errore=accesso_fallito`);
}
