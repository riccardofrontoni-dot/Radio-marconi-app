"use client";

import { useState } from "react";
import SocialCharts from "@/components/SocialCharts";
import BestTimeToPost from "@/components/BestTimeToPost";

type MediaItem = {
  id: string;
  caption: string;
  likes: number;
  comments: number;
  views: number;
  profileVisits: number;
  followersGained: number;
  permalink: string;
  thumbnail: string | null;
  timestamp?: string;
};

type SocialProps = {
  instaLive: {
    follower: number;
    username: string;
    latestMedia: MediaItem | null;
    bestMedia: MediaItem | null;
    worstMedia: MediaItem | null;
  };
  history: any[];
};

export default function SocialTabs({ instaLive, history }: SocialProps) {
  const [activeTab, setActiveTab] = useState<"instagram" | "facebook" | "tiktok">("instagram");
  const [selectedMedia, setSelectedMedia] = useState<{ item: MediaItem; label: string } | null>(null);

  return (
    <div>
      {/* Selettore Piattaforma */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
        {[
          { id: "instagram", label: "Instagram", color: "#E1306C" },
          { id: "facebook", label: "Facebook", color: "#1877F2" },
          { id: "tiktok", label: "TikTok", color: "#000000" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "8px 18px",
              borderRadius: 20,
              border: "none",
              background: activeTab === tab.id ? tab.color : "transparent",
              color: activeTab === tab.id ? "#fff" : "var(--dark)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENUTO INSTAGRAM */}
      {activeTab === "instagram" && (
        <div>
          {/* 1. FOLLOWER IN TEMPO REALE */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <div
              className="card"
              style={{
                background: "#ffffff",
                border: "1.5px solid rgba(34, 197, 94, 0.3)",
                padding: "24px 44px",
                borderRadius: 20,
                textAlign: "center",
                boxShadow: "0 8px 30px rgba(34, 197, 94, 0.08)",
                minWidth: 280,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ height: 8, width: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#16a34a", fontWeight: 700 }}>
                  FOLLOWER IN TEMPO REALE
                </span>
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#15803d", letterSpacing: "-1px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                {instaLive.follower.toLocaleString("it-IT")}
              </div>
            </div>
          </div>

          {/* 2. I 3 BOX REEL */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 24 }}>
            {/* ULTIMO CONTENUTO */}
            {instaLive.latestMedia && (
              <div
                className="card"
                onClick={() => setSelectedMedia({ item: instaLive.latestMedia!, label: "ULTIMO CONTENUTO" })}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  cursor: "pointer",
                  borderLeft: "5px solid #E1306C",
                  padding: "16px",
                  borderRadius: 14,
                }}
              >
                {instaLive.latestMedia.thumbnail && (
                  <img src={instaLive.latestMedia.thumbnail} alt="Ultimo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />
                )}
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#E1306C", fontWeight: 700, letterSpacing: 0.5 }}>
                    ULTIMO CONTENUTO ↗
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", marginTop: 2 }}>
                    {instaLive.latestMedia.caption}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 4 }}>
                    ❤️ {instaLive.latestMedia.likes} · 💬 {instaLive.latestMedia.comments}
                  </div>
                </div>
              </div>
            )}

            {/* REEL PIÙ VISTO */}
            {instaLive.bestMedia && (
              <div
                className="card"
                onClick={() => setSelectedMedia({ item: instaLive.bestMedia!, label: "REEL PIÙ VISTO 🔥" })}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  cursor: "pointer",
                  borderLeft: "5px solid #22c55e",
                  padding: "16px",
                  borderRadius: 14,
                }}
              >
                {instaLive.bestMedia.thumbnail && (
                  <img src={instaLive.bestMedia.thumbnail} alt="Best" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />
                )}
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 0.5 }}>
                    REEL PIÙ VISTO 🔥
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", marginTop: 2 }}>
                    {instaLive.bestMedia.caption}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 4 }}>
                    ❤️ {instaLive.bestMedia.likes} · 💬 {instaLive.bestMedia.comments}
                  </div>
                </div>
              </div>
            )}

            {/* REEL MENO VISTO */}
            {instaLive.worstMedia && (
              <div
                className="card"
                onClick={() => setSelectedMedia({ item: instaLive.worstMedia!, label: "REEL MENO VISTO 📉" })}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  cursor: "pointer",
                  borderLeft: "5px solid #ef4444",
                  padding: "16px",
                  borderRadius: 14,
                }}
              >
                {instaLive.worstMedia.thumbnail && (
                  <img src={instaLive.worstMedia.thumbnail} alt="Worst" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />
                )}
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, letterSpacing: 0.5 }}>
                    REEL MENO VISTO 📉
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", marginTop: 2 }}>
                    {instaLive.worstMedia.caption}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--gray-text)", marginTop: 4 }}>
                    ❤️ {instaLive.worstMedia.likes} · 💬 {instaLive.worstMedia.comments}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. SUGGERITORE ORARIO DI PUBBLICAZIONE */}
          <BestTimeToPost />

          {/* 4. GRAFICO FOLLOWER */}
          <SocialCharts initialData={history || []} />
        </div>
      )}

      {/* CONTENUTO FACEBOOK */}
      {activeTab === "facebook" && (
        <div className="card" style={{ padding: 20, color: "var(--gray-text)", fontSize: 13 }}>
          Sezione Facebook pronta per la configurazione.
        </div>
      )}

      {/* CONTENUTO TIKTOK */}
      {activeTab === "tiktok" && (
        <div className="card" style={{ padding: 20, color: "var(--gray-text)", fontSize: 13 }}>
          Sezione TikTok pronta per la configurazione.
        </div>
      )}

      {/* MODALE DETTAGLIO CONTENUTO */}
      {selectedMedia && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="card"
            style={{
              width: "90%",
              maxWidth: 420,
              background: "#fff",
              padding: 24,
              borderRadius: 20,
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#E1306C", textTransform: "uppercase" }}>
                {selectedMedia.label}
              </span>
              <button
                onClick={() => setSelectedMedia(null)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--gray-text)" }}
              >
                ✕
              </button>
            </div>

            {selectedMedia.item.thumbnail && (
              <img
                src={selectedMedia.item.thumbnail}
                alt="Preview"
                style={{ width: "100%", height: 210, objectFit: "cover", borderRadius: 14, marginBottom: 14 }}
              />
            )}

            <p style={{ fontSize: 13, color: "var(--dark)", fontWeight: 500, marginBottom: 16, lineHeight: 1.4 }}>
              "{selectedMedia.item.caption}"
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "#f8f9fa", padding: 14, borderRadius: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--gray-text)" }}>👁️ Visualizzazioni</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMedia.item.views.toLocaleString("it-IT")}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "var(--gray-text)" }}>❤️ Mi Piace</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMedia.item.likes.toLocaleString("it-IT")}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "var(--gray-text)" }}>💬 Commenti</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedMedia.item.comments.toLocaleString("it-IT")}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "var(--gray-text)" }}>👤 Visite al Profilo</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>+{selectedMedia.item.profileVisits}</div>
              </div>

              <div style={{ gridColumn: "span 2", borderTop: "1px solid #e5e7eb", paddingTop: 8, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>➕ Follower Portati dal Video</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#15803d" }}>+{selectedMedia.item.followersGained} follower</div>
              </div>
            </div>

            <a
              href={selectedMedia.item.permalink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px",
                background: "linear-gradient(135deg, #E1306C 0%, #C13584 100%)",
                color: "#fff",
                borderRadius: 12,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Apri su Instagram ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}