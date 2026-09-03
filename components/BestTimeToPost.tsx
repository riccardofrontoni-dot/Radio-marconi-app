"use client";

type TimeSlot = {
  giorno: string;
  orarioConsigliato: string;
  livelloAttivita: "Alto" | "Molto Alto" | "Picco Massimo";
  score: number;
};

export default function BestTimeToPost() {
  // Esempio di fasce calcolate sui dati storici dei Reel
  const suggerimenti: TimeSlot[] = [
    { giorno: "Oggi (Giovedì)", orarioConsigliato: "18:30 - 19:30", livelloAttivita: "Picco Massimo", score: 98 },
    { giorno: "Domani (Venerdì)", orarioConsigliato: "13:00 - 14:00", livelloAttivita: "Molto Alto", score: 88 },
    { giorno: "Sabato", orarioConsigliato: "17:00 - 18:00", livelloAttivita: "Alto", score: 79 },
  ];

  const oggi = suggerimenti[0];

  return (
    <div
      className="card"
      style={{
        marginTop: 20,
        padding: "20px 24px",
        background: "linear-gradient(135deg, #ffffff 0%, #f4f9ff 100%)",
        border: "1px solid rgba(0, 163, 255, 0.2)",
        borderRadius: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#00A3FF", letterSpacing: 0.5, textTransform: "uppercase" }}>
              Suggeritore Orario di Pubblicazione
            </span>
          </div>
          <h4 style={{ fontSize: 18, fontWeight: 700, color: "var(--dark)", margin: 0 }}>
            Orario consigliato per il prossimo Reel
          </h4>
        </div>

        <div style={{ background: "rgba(0, 163, 255, 0.1)", padding: "6px 12px", borderRadius: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#00A3FF" }}>
            Attività stimata: {oggi.score}%
          </span>
        </div>
      </div>

      {/* Riquadro evidenziato per il giorno corrente */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          background: "#fff",
          borderRadius: 12,
          border: "1px dashed rgba(0, 163, 255, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--gray-text)" }}>Fascia d'oro per {oggi.giorno}:</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#00A3FF", marginTop: 2 }}>
            🕒 {oggi.orarioConsigliato}
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--dark)", fontWeight: 500, maxWidth: 280 }}>
          💡 In questa fascia si concentra il maggior numero di interazioni sui Reel di Radio Marconi.
        </div>
      </div>

      {/* Prospetto per i prossimi giorni */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        {suggerimenti.slice(1).map((item, idx) => (
          <div
            key={idx}
            style={{
              padding: "10px 14px",
              background: "#ffffff",
              borderRadius: 10,
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          >
            <div style={{ color: "var(--gray-text)", fontWeight: 500 }}>{item.giorno}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--dark)", marginTop: 2 }}>
              {item.orarioConsigliato}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}