"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const FEATURES = [
  { color: "#34D399", text: "Task e checklist per ogni reparto, sempre aggiornati" },
  { color: "#FBBF24", text: "Calendario condiviso con tutte le dirette del mese" },
  { color: "#818CF8", text: "Resoconti qualità con voto e PDF automatico" },
  { color: "#F472B6", text: "Numeri social raccolti in un colpo d'occhio" },
];

export default function LoginPage() {
  const supabase = createClient();
  const schoolDomain = process.env.NEXT_PUBLIC_SCHOOL_EMAIL_DOMAIN;

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Filtra visivamente solo gli account del dominio scolastico.
        // La verifica vera avviene lato server nella route di callback.
        queryParams: schoolDomain ? { hd: schoolDomain } : undefined,
      },
    });
  }

  return (
    <div className="login-grid" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* ---------- sinistra: form ---------- */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <Image src="/logo.png" alt="Radio Marconi" width={60} height={60} style={{ objectFit: "contain", marginBottom: 28 }} />

          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, color: "var(--dark)", marginBottom: 6 }}>
            Bentornato
          </h1>
          <p style={{ color: "var(--gray-text)", fontSize: 14.5, marginBottom: 32 }}>
            Accedi con la tua email della scuola per entrare nella dashboard.
          </p>

          <button
            onClick={handleLogin}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "13px 16px", borderRadius: 12, border: "1px solid var(--border)",
              background: "var(--white)", fontSize: 14.5, fontWeight: 600, color: "var(--dark)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <GoogleIcon />
            Continua con Google
          </button>

          <p style={{ color: "#a1a1a6", fontSize: 12, marginTop: 18, textAlign: "center" }}>
            Solo email {schoolDomain ? <b>@{schoolDomain}</b> : "della scuola"} — l'accesso è riservato agli studenti e ai responsabili di Radio Marconi.
          </p>
        </div>
      </div>

      {/* ---------- destra: pannello di benvenuto ---------- */}
      <div
        className="login-right"
        style={{
          position: "relative", overflow: "hidden",
          background: "radial-gradient(130% 130% at 85% 15%, #4CAF6D 0%, #0F3D22 50%, #06140C 100%)",
          display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 56px",
        }}
      >
        <svg
          width="480" height="480" viewBox="0 0 480 480"
          style={{ position: "absolute", right: -120, bottom: -140, opacity: 0.16, pointerEvents: "none" }}
        >
          {[80, 135, 190, 245].map((r) => (
            <circle key={r} cx="240" cy="240" r={r} fill="none" stroke="#A9E0BB" strokeWidth="1.5" />
          ))}
        </svg>

        <div style={{ position: "relative", maxWidth: 420 }}>
          <div
            style={{
              width: 92, height: 92, borderRadius: 22, background: "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28,
            }}
          >
            <Image src="/logo.png" alt="" width={58} height={58} style={{ objectFit: "contain", filter: "invert(1)" }} />
          </div>

          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1.25, marginBottom: 10 }}>
            La dashboard di Radio Marconi
          </h2>
          <p style={{ color: "#B9C6F5", fontSize: 14.5, lineHeight: 1.6, marginBottom: 34 }}>
            Un solo posto per organizzare puntate, dirette e resoconti — pensato per studenti e responsabili.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {FEATURES.map((f) => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: f.color, flexShrink: 0 }} />
                <span style={{ color: "#E4E9FA", fontSize: 13.5 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
