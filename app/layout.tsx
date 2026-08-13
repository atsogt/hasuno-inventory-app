import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hasuno — Inventory Requests",
  manifest: "/manifest.json",
  icons: [{ rel: "icon", url: "/logo.png" }, { rel: "apple-touch-icon", url: "/logo.png" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F6F1E6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-[480px] mx-auto min-h-screen flex flex-col bg-paper relative">
          {children}
        </div>
      </body>
    </html>
  );
}
