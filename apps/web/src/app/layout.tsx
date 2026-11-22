import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/geist-mono";
import "./globals.css";
import { ChainProviders } from "@/features/chain/ChainProviders";

export const metadata: Metadata = {
  title: "claw",
  description:
    "A provably fair claw machine on Solana, powered by MagicBlock Ephemeral Rollups and VRF.",
};

export const viewport: Viewport = {
  themeColor: "#0c070f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preload" href="/fonts/geist-latin-wght.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-full">
        <ChainProviders>{children}</ChainProviders>
      </body>
    </html>
  );
}
