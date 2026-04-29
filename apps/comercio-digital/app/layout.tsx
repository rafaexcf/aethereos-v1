import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Comércio Digital",
    template: "%s | Comércio Digital",
  },
  description:
    "Plataforma de comércio B2B integrada ao ecossistema Aethereos. Gerencie produtos, pedidos e clientes em um só lugar.",
  openGraph: {
    type: "website",
    siteName: "Comércio Digital",
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
