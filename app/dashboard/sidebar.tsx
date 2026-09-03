"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";
import { impostaVistaRad } from "@/lib/actions";

const REPARTO_LABEL: Record<string, string> = {
  speaker: "Speaker",
  social: "Social media",
  tecnico_video: "Tecnico video",
  tecnico_audio: "Tecnico audio",
  qualita: "Qualità",
};

const OPZIONI_VISTA = [
  { value: "rad", label: "Io (RAD)" },
  { value: "speaker:membro", label: "Speaker — Membro" },
  { value: "speaker:capo", label: "Speaker — Capo" },
  { value: "social:membro", label: "Social — Membro" },
  { value: "social:capo", label: "Social — Capo" },
  { value: "tecnico_video:membro", label: "Tecnico video — Membro" },
  { value: "tecnico_video:capo", label: "Tecnico video — Capo" },
  { value: "tecnico_audio:membro", label: "Tecnico audio — Membro" },
  { value: "tecnico_audio:capo", label: "Tecnico audio — Capo" },
  { value: "qualita:membro", label: "Qualità — Membro" },
  { value: "qualita:capo", label: "Qualità — Capo" },
  { value: "professore", label: "Professore" },
];

export default function Sidebar({
  isCapo,
  isRad,
  isQualita,
  isSpeaker,
  isSocial,
  isProfessore,
  resocontiInAttesa,
  fullName,
  email,
  reparto,
  veroRad,
  vistaAttuale,
}: {
  isCapo: boolean;
  isRad: boolean;
  isQualita: boolean;
  isSpeaker: boolean;
  isSocial: boolean;
  isProfessore: boolean;
  resocontiInAttesa: number;
  fullName: string | null;
  email: string;
  reparto: string | null;
  veroRad: boolean;
  vistaAttuale: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const displayName = fullName || email;
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const badge = isRad ? "RAD" : `${isCapo ? "Capo reparto — " : ""}${REPARTO_LABEL[reparto ?? ""] ?? ""}`;
  const vistaAttiva = veroRad && vistaAttuale !== "rad";

  function cambiaVista(valore: string) {
    startTransition(async () => {
      await impostaVistaRad(valore);
      router.refresh();
    });
  }

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

      <NavLabel>{isProfessore ? "Andamento" : "Il tuo spazio"}</NavLabel>
      <NavItem href="/dashboard" pathname={pathname}>{isProfessore ? "Andamento progetto" : "Home"}</NavItem>
      {!isProfessore && <NavItem href="/dashboard/task" pathname={pathname}>Task reparto</NavItem>}
      {isCapo && <NavItem href="/dashboard/membri-reparto" pathname={pathname}>Membri del reparto</NavItem>}
      <NavItem href="/dashboard/calendario" pathname={pathname}>Calendario</NavItem>
      {!isProfessore && <NavItem href="/dashboard/materiali" pathname={pathname}>Materiali</NavItem>}
      <NavItem href="/dashboard/obiettivi" pathname={pathname}>Obiettivi annui</NavItem>

      {isProfessore && (
        <>
          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>Professori</NavLabel>
          <NavItem href="/dashboard/presenze" pathname={pathname}>Presenze</NavItem>
          <NavItem href="/dashboard/analisi" pathname={pathname}>Analisi</NavItem>
          <NavItem href="/dashboard/analisi-puntate" pathname={pathname}>Analisi puntate</NavItem>
        </>
      )}

      {isSpeaker && (
        <>
          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>Speaker</NavLabel>
          <NavItem href="/dashboard/script" pathname={pathname}>I miei script</NavItem>
          <NavItem href="/dashboard/timer" pathname={pathname}>Timer diretta</NavItem>
        </>
      )}

      {isSocial && (
        <>
          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>Social</NavLabel>
          <NavItem href="/dashboard/social-script" pathname={pathname}>I miei script social</NavItem>
        </>
      )}

      {isQualita && (
        <>
          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>Qualità</NavLabel>
          <NavItem href="/dashboard/qualita" pathname={pathname}>Resoconto puntata</NavItem>
          <NavItem href="/dashboard/valutazioni" pathname={pathname}>Valutazioni</NavItem>
          <NavItem href="/dashboard/analisi-puntate" pathname={pathname}>Analisi puntate</NavItem>
        </>
      )}

      {isRad && (
        <>
          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>RAD</NavLabel>
          <NavItem href="/dashboard/admin" pathname={pathname}>Amministrazione</NavItem>
          <NavItem href="/dashboard/membri" pathname={pathname}>Membri</NavItem>
          <NavItem href="/dashboard/script-archivio" pathname={pathname}>Script puntate</NavItem>
          <NavItem href="/dashboard/social" pathname={pathname}>Social</NavItem>

          <div className="nav-divider" style={{ height: 1, background: "var(--border)", margin: "14px 8px" }} />
          <NavLabel>Analisi</NavLabel>
          <NavItem href="/dashboard/analisi" pathname={pathname}>Analisi</NavItem>
          <NavItem href="/dashboard/analisi-puntate" pathname={pathname}>Analisi puntate</NavItem>
          <NavItem href="/dashboard/resoconti" pathname={pathname}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              Resoconti qualità
              {resocontiInAttesa > 0 && (
                <span style={{ background: "#DC2626", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 999, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                  {resocontiInAttesa}
                </span>
              )}
            </span>
          </NavItem>
          <NavItem href="/dashboard/valutazioni" pathname={pathname}>Valutazioni</NavItem>
        </>
      )}

      <div className="sidebar-footer" style={{ marginTop: "auto", padding: 10 }}>
        {vistaAttiva && (
          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 8, padding: "6px 10px", marginBottom: 10, fontSize: 11, color: "#92400E", fontWeight: 600 }}>
            👁 Vista di prova attiva
          </div>
        )}
        {veroRad && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10.5, fontWeight: 600, color: "var(--gray-text)", display: "block", marginBottom: 3 }}>
              Visualizza come
            </label>
            <select
              value={vistaAttuale}
              onChange={(e) => cambiaVista(e.target.value)}
              disabled={isPending}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 11.5, fontFamily: "inherit", background: "var(--white)" }}
            >
              {OPZIONI_VISTA.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
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
