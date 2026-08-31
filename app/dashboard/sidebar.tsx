"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";

const REPARTO_LABEL: Record<string, string> = {
  speaker: "Speaker",
  social: "Social media",
  tecnico_video: "Tecnico video",
  tecnico_audio: "Tecnico audio",
  qualita: "Qualità",
};

export default function Sidebar({
  isCapo,
  isRad,
  isQualita,
  isSpeaker,
  fullName,
  email,
  reparto,
}: {
  isCapo: boolean;
  isRad: boolean;
  isQualita: boolean;
  isSpeaker: boolean;
  fullName: string | null;
  email: string;
  reparto: string | null;
}) {
  const pathname = usePathname();
  const displayName = fullName || email;
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const badge = isRad ? "RAD" : `${isCapo ? "Capo reparto — " : ""}${REPARTO_LABEL[reparto ?? ""] ?? ""}`;

  return (
    <div
      className="dashboard-sidebar"
      style={{
        width: "var(--sidebar-w)",
        flexShrink: 0,
        background: "var(--light-bg)",
        padding: "22px 16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px", marginBottom: 30 }}>
        <Image src="/logo.png" alt="Radio Marconi" width={38} height={38} style={{ objectFit: "contain" }} />
        <span className="sidebar-brand-text" style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16 }}>
          Radio Marconi
        </span>
      </div>

      <NavLabel>Il tuo spazio</NavLabel>
      <NavItem href="/dashboard" pathname={pathname}>Home</NavItem>
      <NavItem href="/dashboard/task" pathname={pathname}>Task reparto</NavItem>
      <NavItem href="/dashboard/calendario" pathname={pathname}>Calendario</NavItem>
      <NavItem href="/dashboard/materiali" pathname={pathname}>Materiali</NavItem>
      <NavItem href="/dashboard/obiettivi" pathname={pathname}>Obiettivi annui</NavItem>

      {isSpeaker && (
        <>
          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>Speaker</NavLabel>
          <NavItem href="/dashboard/script" pathname={pathname}>I miei script</NavItem>
          <NavItem href="/dashboard/timer" pathname={pathname}>Timer diretta</NavItem>
        </>
      )}

      {isQualita && (
        <>
          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>Qualità</NavLabel>
          <NavItem href="/dashboard/qualita" pathname={pathname}>Resoconto puntata</NavItem>
          <NavItem href="/dashboard/valutazioni" pathname={pathname}>Valutazioni</NavItem>
        </>
      )}

      {isRad && (
        <>
          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>RAD</NavLabel>
          <NavItem href="/dashboard/admin" pathname={pathname}>Amministrazione</NavItem>
          <NavItem href="/dashboard/membri" pathname={pathname}>Membri</NavItem>
          <NavItem href="/dashboard/analisi" pathname={pathname}>Analisi</NavItem>
          <NavItem href="/dashboard/resoconti" pathname={pathname}>Resoconti qualità</NavItem>
          <NavItem href="/dashboard/valutazioni" pathname={pathname}>Valutazioni</NavItem>
          <NavItem href="/dashboard/script-archivio" pathname={pathname}>Script puntate</NavItem>
          <NavItem href="/dashboard/social" pathname={pathname}>Social</NavItem>
        </>
      )}

      <div className="sidebar-footer" style={{ marginTop: "auto", padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: "50%", background: "#E5F4EA",
              color: "#1F5C33", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 12.5, flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ fontSize: 12.5, overflow: "hidden" }}>
            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
            <div style={{ color: "var(--gray-text)" }}>{badge}</div>
          </div>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

function NavItem({ href, pathname, children }: { href: string; pathname: string; children: React.ReactNode }) {
  const isActive = pathname === href;
  return (
    <Link href={href} className={`nav-item${isActive ? " active" : ""}`}>
      {children}
    </Link>
  );
}
function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="nav-label" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a1a1a6", padding: "0 12px", marginBottom: 6, marginTop: 4 }}>
      {children}
    </div>
  );
}
