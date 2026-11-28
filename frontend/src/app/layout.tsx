import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
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
