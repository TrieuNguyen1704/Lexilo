import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lexilo — Học tiếng Anh thông minh",
  description: "Flashcard tiếng Anh ngoại tuyến với lặp lại ngắt quãng.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
