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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1E6" },
    { media: "(prefers-color-scheme: dark)", color: "#131918" },
  ],
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("hasuno-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <div className="max-w-[480px] mx-auto min-h-screen flex flex-col bg-paper relative">
          {children}
        </div>
      </body>
    </html>
  );
}
