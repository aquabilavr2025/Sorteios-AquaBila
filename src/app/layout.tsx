import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AquaBila Sorteios | O teu universo de sorte", template: "%s | AquaBila Sorteios" },
  description: "Acompanha os sorteios AquaBila em direto, descobre os números vencedores e consulta o histórico dos últimos 14 dias.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#071d2c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
