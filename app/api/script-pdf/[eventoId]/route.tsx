import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1D1D1F" },
  titolo: { fontSize: 20, textAlign: "center", marginBottom: 2 },
  data: { fontSize: 9, textAlign: "center", color: "#6E6E73", marginBottom: 18 },
  nota: { fontSize: 8, color: "#6E6E73", marginBottom: 10 },
  headerBar: { backgroundColor: "#0C2261", color: "#fff", padding: 6, fontSize: 11, fontWeight: 700, textAlign: "center" },
  infoRow: { flexDirection: "row", borderWidth: 0.5, borderColor: "#D2D2D7", borderTopWidth: 0 },
  infoCell: { flex: 1, padding: 8, borderRightWidth: 0.5, borderColor: "#D2D2D7", fontSize: 9 },
  infoLabel: { fontSize: 8, color: "#6E6E73", marginBottom: 2 },
  blocGreen: { backgroundColor: "#1F5C33", color: "#fff", padding: 6, fontSize: 10, fontWeight: 700, flexDirection: "row", justifyContent: "space-between" },
  blocRed: { backgroundColor: "#991B1B", color: "#fff", padding: 6, fontSize: 10, fontWeight: 700, flexDirection: "row", justifyContent: "space-between" },
  blocGray: { backgroundColor: "#6E6E73", color: "#fff", padding: 6, fontSize: 10, fontWeight: 700, flexDirection: "row", justifyContent: "space-between" },
  contenuto: { borderWidth: 0.5, borderColor: "#D2D2D7", borderTopWidth: 0, padding: 8 },
  sottotitolo: { fontSize: 9.5, fontWeight: 700, marginBottom: 6 },
  punto: { fontSize: 9, marginBottom: 2 },
  sectionSpacer: { marginTop: 14 },
});

export async function GET(request: Request, { params }: { params: { eventoId: string } }) {
  const supabase = createClient();

  const { data: evento } = await supabase.from("events").select("titolo, quando").eq("id", params.eventoId).maybeSingle();
  const { data: script } = await supabase.from("script_puntata").select("*").eq("evento_id", params.eventoId).maybeSingle();

  if (!script) {
    return NextResponse.json({ error: "Nessuno script trovato per questa puntata." }, { status: 404 });
  }

  const { data: blocchi } = await supabase
    .from("script_blocchi")
    .select("*")
    .eq("script_id", script.id)
    .order("ordine", { ascending: true });

  const dataFormattata = evento ? new Date(evento.quando).toLocaleDateString("it-IT") : "";

  const barStyle = (tipo: string) => (tipo === "blocco" ? styles.blocGreen : tipo === "pausa" ? styles.blocRed : styles.blocGray);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titolo}>Scaletta Puntata</Text>
        <Text style={styles.data}>{dataFormattata}</Text>
        <Text style={styles.nota}>DB = Descrizione breve</Text>

        <View style={styles.headerBar}><Text>INFORMAZIONI</Text></View>
        <View style={styles.infoRow}>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Titolo</Text><Text>{script.titolo}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Materiale</Text><Text>{script.materiale || "—"}</Text></View>
          <View style={{ flex: 1, padding: 8, fontSize: 9 }}><Text style={styles.infoLabel}>Descrizione breve</Text><Text>{script.descrizione_breve || "—"}</Text></View>
        </View>

        <View style={styles.sectionSpacer}>
          <View style={styles.headerBar}><Text>Scaletta puntata</Text></View>
        </View>

        {(blocchi ?? []).map((b, i) => (
          <View key={i} wrap={false}>
            <View style={barStyle(b.tipo)}>
              <Text>{b.nome}</Text>
              <Text>{b.durata_minuti}m</Text>
            </View>
            {b.tipo === "blocco" && (
              <View style={styles.contenuto}>
                {b.sottotitolo && <Text style={styles.sottotitolo}>{b.sottotitolo}</Text>}
                {(b.punti ?? "").split("\n").filter(Boolean).map((p: string, j: number) => (
                  <Text key={j} style={styles.punto}>• {p}</Text>
                ))}
                {b.materiale && <Text style={{ fontSize: 8, color: "#6E6E73", marginTop: 4 }}>Materiale: {b.materiale}</Text>}
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="scaletta-${(script.titolo || "puntata").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`,
    },
  });
}
