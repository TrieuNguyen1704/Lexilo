import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#ff6b4a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Lexilo — Học tiếng Anh thông minh",
  description: "Flashcard tiếng Anh ngoại tuyến với lặp lại ngắt quãng.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lexilo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lexilo" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
