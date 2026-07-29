import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
export const metadata: Metadata = {
  title: "LocalHands | Verified Skills in The Gambia",
  description: "Find and hire verified skilled workers in The Gambia.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50">
        <Header />
        <main className="pb-20 pt-16 min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
