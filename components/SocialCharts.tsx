"use client";

import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type StatItem = { data: string; follower: number; views: number; likes: number; rilevato_il?: string };

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const diff = data.diff;

    return (
      <div
        style={{
          background: "#1c1c1e",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          fontSize: 12,
        }}
      >
        <div style={{ color: "#a1a1a6", marginBottom: 4, fontSize: 11 }}>
          🕒 {data.orarioEsteso}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {data.follower.toLocaleString("it-IT")} follower
          </span>
          {diff !== undefined && diff !== 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 6,
                background: diff > 0 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                color: diff > 0 ? "#22c55e" : "#ef4444",
              }}
            >
              {diff > 0 ? `+${diff}` : diff}
            </span>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function SocialCharts({ initialData }: { initialData: StatItem[] }) {
  const [range, setRange] = useState<"1h" | "7d" | "30d" | "school_year">("1h");

  // 1. Ordinamento cronologico
  const sortedData = [...initialData].sort((a, b) => {
    const timeA = new Date(a.rilevato_il || a.data).getTime();
    const timeB = new Date(b.rilevato_il || b.data).getTime();
    return timeA - timeB;
  });

  // 2. Filtro temporale
  const filteredDataRaw = sortedData.filter((item) => {
    const timestamp = new Date(item.rilevato_il || item.data);
    const now = new Date();

    if (range === "1h") {
      const limit = new Date(now.getTime() - 60 * 60 * 1000);
      return timestamp >= limit;
    }
    if (range === "7d") {
      const limit = new Date();
      limit.setDate(now.getDate() - 7);
      return timestamp >= limit;
    }
    if (range === "30d") {
      const limit = new Date();
      limit.setDate(now.getDate() - 30);
      return timestamp >= limit;
    }
    if (range === "school_year") {
      const sept2026 = new Date("2026-09-01");
      return timestamp >= sept2026;
    }
    return true;
  });

  // 3. Formattazione e calcolo delta punto per punto
  const filteredData = filteredDataRaw.map((item, index) => {
    const prevFollower = index > 0 ? filteredDataRaw[index - 1].follower : item.follower;
    const diff = item.follower - prevFollower;
    const dateObj = new Date(item.rilevato_il || item.data);

    return {
      ...item,
      diff: index === 0 ? 0 : diff,
      labelOra:
        range === "1h"
          ? dateObj.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : dateObj.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }),
      orarioEsteso: dateObj.toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  });

  return (
    <div className="card" style={{ marginTop: 24, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 17 }}>Crescita Follower Instagram</h3>
          <p style={{ fontSize: 12.5, color: "var(--gray-text)" }}>Andamento e variazioni rilevate</p>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "1h", label: "Ultima Ora" },
            { id: "7d", label: "7 Giorni" },
            { id: "30d", label: "30 Giorni" },
            { id: "school_year", label: "Da Settembre 2026" },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => setRange(b.id as any)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: range === b.id ? "var(--dark)" : "var(--white)",
                color: range === b.id ? "#fff" : "var(--dark)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: 280 }}>
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00A3FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="labelOra" style={{ fontSize: 11 }} />
              <YAxis
                style={{ fontSize: 11 }}
                allowDecimals={false}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="follower"
                stroke="#00A3FF"
                fillOpacity={1}
                fill="url(#blueGradient)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#00A3FF", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--gray-text)", fontSize: 13 }}>
            Nessuna variazione nell'ultima ora. Ricarica la pagina per registrare nuove rilevazioni.
          </div>
        )}
      </div>
    </div>
  );
}