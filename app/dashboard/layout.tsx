import { redirect } from "next/navigation";
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

  const isCapo = profile.ruolo === "capo";
  const isRad = profile.ruolo === "rad";
  const isQualita = profile.reparto === "qualita";
  const isSpeaker = profile.reparto === "speaker";

  return (
    <div className="dashboard-shell" style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        isCapo={isCapo}
        isRad={isRad}
        isQualita={isQualita}
        isSpeaker={isSpeaker}
        fullName={profile.full_name}
        email={profile.email}
        reparto={profile.reparto}
      />
      <div className="dashboard-main" style={{ flex: 1, padding: "36px 44px", maxWidth: 980, width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
