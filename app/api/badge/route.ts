import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration URL di Supabase
const supabaseUrl = 'https://zkidiorbrjahpjbvtlpa.supabase.co';

// La chiave service_role è necessaria per eseguire inserimenti diretti nel database
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rfid_uid } = body;

    if (!rfid_uid) {
      return NextResponse.json(
        { error: 'Parametro rfid_uid mancante' },
        { status: 400 }
      );
    }

    // 1. Cerca l'utente associato all'UID della tessera
    const { data: user, error: userError } = await supabase
      .from('badge_users')
      .select('id, nome, matricola, rfid_uid')
      .eq('rfid_uid', rfid_uid)
      .single();

    if (userError || !user) {
      console.log(`Badge sconosciuto: ${rfid_uid}`);
      return NextResponse.json(
        { error: 'Badge non riconosciuto o non assegnato' },
        { status: 404 }
      );
    }

    const oraAttuale = new Date();

    // 2. Determina il tipo di timbratura (INGRESSO / USCITA alternati)
    const { data: lastLog } = await supabase
      .from('attendance_logs')
      .select('tipo')
      .eq('user_id', user.id)
      .order('timbrato_il', { ascending: false })
      .limit(1)
      .maybeSingle();

    const tipoTimbratura = lastLog?.tipo === 'INGRESSO' ? 'USCITA' : 'INGRESSO';

    // 3. Registra la timbratura su Supabase
    const { data: newLog, error: logError } = await supabase
      .from('attendance_logs')
      .insert({
        user_id: user.id,
        nome: user.nome,
        matricola: user.matricola,
        tipo: tipoTimbratura,
        timbrato_il: oraAttuale.toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Errore inserimento Supabase:', logError);
      return NextResponse.json(
        { error: 'Errore durante la registrazione nel database', dettagli: logError.message },
        { status: 500 }
      );
    }

    // 4. Risposta al lettore ESP32
    return NextResponse.json({
      success: true,
      utente: user.nome,
      tipo: tipoTimbratura,
      orario: oraAttuale.toLocaleTimeString('it-IT'),
      log_id: newLog.id,
    });

  } catch (err: any) {
    console.error('Errore generico API Badge:', err);
    return NextResponse.json(
      { error: 'Errore interno del server', message: err.message },
      { status: 500 }
    );
  }
}

// Supporto alle richieste OPTIONS per evitare blocchi CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}