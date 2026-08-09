import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ServiceWorker } from "./service-worker";

export const metadata: Metadata = {
  title: "Neuralese Compiler — prose → high-density LLM notation",
  description:
    "Convert natural English prose into compact, high-density, LLM-readable neuralese notation. Installable PWA, works offline.",
  manifest: "/manifest.webmanifest",
  applicationName: "Neuralese Compiler",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Neuralese",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b1020] text-slate-100 antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
