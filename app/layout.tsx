import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radio Marconi — Dashboard",
  description: "La dashboard di Radio Marconi",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/logopwa_192.png",
    apple: "/icons/logopwa_192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Radio Marconi - Dashboard", // <-- Questo è il nome predefinito per la schermata Home di iOS
  },
};

export const viewport: Viewport = {
  themeColor: "#43a047",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}