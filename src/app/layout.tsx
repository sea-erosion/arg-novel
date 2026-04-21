import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAI-DIARY — Archive Interface",
  description: "日記デバイス閲覧システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text font-mono antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
