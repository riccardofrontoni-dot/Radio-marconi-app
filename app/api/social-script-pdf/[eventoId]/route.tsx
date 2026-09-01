import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1D1D1F" },
  titolo: { fontSize: 18, textAlign: "center", marginBottom: 2, fontWeight: 700 },
  data: { fontSize: 9, textAlign: "center", color: "#6E6E73", marginBottom: 20 },
  bloccoHeader: { backgroundColor: "#1F5C33", color: "#fff", padding: 7, fontSize: 11, fontWeight: 700, flexDirection: "row", justifyContent: "space-between" },
  contenuto: { borderWidth: 0.5, borderColor: "#D2D2D7", borderTopWidth: 0, padding: 10, marginBottom: 16 },
  etichetta: { fontSize: 8.5, fontWeight: 700, color: "#1F5C33", textTransform: "uppercase", marginBottom: 2, marginTop: 8 },
  testo: { fontSize: 9.5, lineHeight: 1.4 },
});

const TIPO_LABEL: Record<string, string> = { format: "Format", informativo: "Video informativo", trend: "Trend" };

export async function GET(request: Request, { params }: { params: { eventoId: string } }) {
  const supabase = createClient();

  const { data: evento } = await supabase.from("events").select("titolo, quando").eq("id", params.eventoId).maybeSingle();
  const { data: script } = await supabase.from("social_script").select("*").eq("evento_id", params.eventoId).maybeSingle();

  if (!script) {
    return NextResponse.json({ error: "Nessuno script trovato per questa giornata." }, { status: 404 });
  }

  const { data: blocchi } = await supabase
    .from("social_script_blocchi")
    .select("*")
    .eq("script_id", script.id)
    .order("ordine", { ascending: true });

  const dataFormattata = evento ? new Date(evento.quando).toLocaleDateString("it-IT") : "";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titolo}>{script.titolo || "Script Social"}</Text>
        <Text style={styles.data}>{dataFormattata}</Text>

        {(blocchi ?? []).map((b, i) => (
          <View key={i} wrap={false}>
            <View style={styles.bloccoHeader}>
              <Text>{i + 1} {b.titolo}</Text>
              <Text>{TIPO_LABEL[b.tipo] || ""}</Text>
            </View>
            <View style={styles.contenuto}>
              {b.gancio && (
                <>
                  <Text style={styles.etichetta}>Gancio</Text>
                  <Text style={styles.testo}>{b.gancio}</Text>
                </>
              )}
              {b.link && (
                <>
                  <Text style={styles.etichetta}>Link di riferimento</Text>
                  <Text style={styles.testo}>{b.link}</Text>
                </>
              )}
              {b.corpo && (
                <>
                  <Text style={styles.etichetta}>Corpo</Text>
                  <Text style={styles.testo}>{b.corpo}</Text>
                </>
              )}
              {b.cta && (
                <>
                  <Text style={styles.etichetta}>CTA finale</Text>
                  <Text style={styles.testo}>{b.cta}</Text>
                </>
              )}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="script-social-${(script.titolo || "giornata").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`,
    },
  });
}
