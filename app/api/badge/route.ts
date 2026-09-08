import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAZIONE CREDENZIALI SUPABASE ---
const supabaseUrl = 'https://zkidiorbrjahpjbvtlpa.supabase.co';

// Inserisci qui la tua SUPABASE_SERVICE_ROLE_KEY presa dalla Dashboard Supabase -> Project Settings -> API
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpraWRpb3JicmphaHBqYnZ0bHBhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY4MjU0NiwiZXhwIjoyMTAzMjU4NTQ2fQ.ry92MENhMK98kTA5ta0jnc6SznSOUnblunI6VZr-ux8';

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
      console.log(`Badge non riconosciuto: ${rfid_uid}`);
      return NextResponse.json(
        { error: 'Badge non riconosciuto o non assegnato' },
        { status: 404 }
      );
    }

    const oraAttuale = new Date();

    // 2. Determina se la timbratura è un INGRESSO o un'USCITA
    const { data: lastLog } = await supabase
      .from('attendance_logs')
      .select('tipo')
      .eq('user_id', user.id)
      .order('timbrato_il', { ascending: false })
      .limit(1)
      .maybeSingle();

    const tipoTimbratura = lastLog?.tipo === 'INGRESSO' ? 'USCITA' : 'INGRESSO';

    // 3. Inserisci la nuova timbratura su Supabase
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
      console.error('Errore durante l\'inserimento su Supabase:', logError);
      return NextResponse.json(
        { error: 'Errore durante la registrazione nel database', dettagli: logError.message },
        { status: 500 }
      );
    }

    // 4. Risposta di successo inviata all'ESP32
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