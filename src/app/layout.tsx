import type { Metadata } from "next";
import "./globals.css"; // Tailwind CSS を読み込む

export const metadata: Metadata = {
  title: "マナベバ",
  description: "AIで学ぶ、中学生のための学習アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
