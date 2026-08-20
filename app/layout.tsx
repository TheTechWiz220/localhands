import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "LocalHands | Verified Skills in The Gambia",
  description: "Find and hire verified skilled workers in The Gambia.",
  applicationName: "LocalHands",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LocalHands",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50">
        <PwaRegister />
        <Header />
        <main className="pb-20 pt-16 min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
