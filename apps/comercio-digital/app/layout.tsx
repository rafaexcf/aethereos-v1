import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_URL =
  process.env["NEXT_PUBLIC_APP_URL"] ?? "https://comercio.digital";

export const metadata: Metadata = {
  title: {
    default: "Comércio Digital",
    template: "%s | Comércio Digital",
  },
  description:
    "Plataforma de comércio B2B integrada ao ecossistema Aethereos. Gerencie produtos, pedidos e clientes em um só lugar.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    siteName: "Comércio Digital",
    title: "Comércio Digital — Plataforma B2B",
    description:
      "Gerencie produtos, pedidos e pagamentos. Integre com o ecossistema Aethereos quando precisar de mais.",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Comércio Digital — Plataforma B2B",
    description:
      "Plataforma de comércio B2B integrada ao ecossistema Aethereos.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
