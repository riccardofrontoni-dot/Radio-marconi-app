import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./sidebar";
import LogoutButton from "./logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status === "in_attesa") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>Account creato</h2>
        <p style={{ color: "var(--gray-text)", fontSize: 14, maxWidth: 380 }}>
          In attesa che un responsabile RAD ti assegni un reparto. Torna qui tra poco.
        </p>
        <div style={{ marginTop: 24 }}>
          <LogoutButton />
        </div>
      </div>
    );
  }

  const veroRad = profile.ruolo === "rad";
  const vistaCookie = cookies().get("vista_rad")?.value;
  const vistaAttuale = veroRad && vistaCookie ? vistaCookie : "rad";

  let repartoEffettivo = profile.reparto;
  let ruoloEffettivo = profile.ruolo;
  if (veroRad && vistaAttuale !== "rad") {
    if (vistaAttuale === "professore") {
      repartoEffettivo = null;
      ruoloEffettivo = "professore";
    } else {
      const [r, ru] = vistaAttuale.split(":");
      if (r && ru) {
        repartoEffettivo = r;
        ruoloEffettivo = ru;
      }
    }
  }

  const isCapo = ruoloEffettivo === "capo";
  const isRad = ruoloEffettivo === "rad";
  const isQualita = repartoEffettivo === "qualita";
  const isSpeaker = repartoEffettivo === "speaker";
  const isSocial = repartoEffettivo === "social";
  const isProfessore = ruoloEffettivo === "professore";

  let resocontiInAttesa = 0;
  if (isRad) {
    const { count } = await supabase
      .from("quality_reports")
      .select("id", { count: "exact", head: true })
      .eq("stato", "in_revisione");
    resocontiInAttesa = count ?? 0;
  }

  return (
    <div className="dashboard-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        isCapo={isCapo}
        isRad={isRad}
        isQualita={isQualita}
        isSpeaker={isSpeaker}
        isSocial={isSocial}
        isProfessore={isProfessore}
        resocontiInAttesa={resocontiInAttesa}
        fullName={profile.full_name}
        email={profile.email}
        reparto={repartoEffettivo}
        veroRad={veroRad}
        vistaAttuale={vistaAttuale}
      />
      <div className="dashboard-main" style={{ flex: 1, padding: "36px 44px", maxWidth: 980, width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
