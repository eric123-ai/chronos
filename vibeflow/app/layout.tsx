import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "../components/I18nProvider";

export const metadata: Metadata = {
  title: "时序 Chronos",
  description: "A bio-synced, goal-driven personal operating system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
