import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./scrapbook.css";

const notes = localFont({ src: "../public/fonts/WenKai-UI.woff2", variable: "--font-notes", display: "swap", adjustFontFallback: false });
const notesFull = localFont({ src: "../public/fonts/WenKai-Full.woff2", variable: "--font-notes-full", display: "swap", preload: false, adjustFontFallback: false });
const display = localFont({ src: "../public/fonts/Smiley-UI.woff2", variable: "--font-display", display: "swap", adjustFontFallback: false });

export const metadata: Metadata = {
  title: "购物冷静器 · 先别急着买",
  description: "把想买的东西放这里，过几天再决定。一个安静的购物冷静清单，记录只保存在你的浏览器。",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icon.svg` },
};
export const viewport: Viewport = { themeColor: "#efeee5" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${notes.variable} ${notesFull.variable} ${display.variable}`}>{children}</body></html>;
}
