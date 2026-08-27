"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        width: "100%",
        padding: "7px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--white)",
        fontSize: 12,
        color: "var(--gray-text)",
      }}
    >
      Esci
    </button>
  );
}
