import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "piGGyPlayer — Offline Music Player",
  description:
    "Offline-first personal music player. Your library stays on this machine — no internet required.",
  applicationName: "piGGyPlayer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "piGGyPlayer",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#07090D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="h-full bg-piggy-abyss text-piggy-text flex flex-col overflow-hidden selection:bg-piggy-rose/20 selection:text-white"
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
