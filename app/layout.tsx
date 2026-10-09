import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";

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
    title: "Radio Marconi - Dashboard",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#43a047" },
    { media: "(prefers-color-scheme: dark)", color: "#171a18" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <meta
          name="apple-mobile-web-app-title"
          content="Radio Marconi - Dashboard"
        />
      </head>

      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}