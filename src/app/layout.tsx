import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://hospedeclub.q-aura.com.br";
const ogImageUrl =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&h=630&q=85";

export const metadata: Metadata = {
  title: "Hóspede Club | Hospedagens e Hotéis com Desconto Exclusivo",
  description:
    "Curadoria de hotéis e resorts com tarifas exclusivas de membro e descontos reais. Faça parte do Hóspede Club e reserve com economia garantida.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Hóspede Club",
    title: "Hóspede Club | Hospedagens e Hotéis com Desconto Exclusivo",
    description:
      "Curadoria de hotéis e resorts com tarifas exclusivas de membro e descontos reais. Reserve com até 35% de economia.",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Hóspede Club - Hotéis e Resorts Exclusivos com Desconto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hóspede Club | Hospedagens e Hotéis com Desconto Exclusivo",
    description:
      "Curadoria de hotéis e resorts com tarifas exclusivas de membro e descontos reais.",
    images: [ogImageUrl],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      "url": siteUrl,
      "name": "Hóspede Club",
      "description":
        "Clube exclusivo de hospedagens e reservas de hotéis com desconto para o cliente final.",
      "inLanguage": "pt-BR",
    },
    {
      "@type": "TravelAgency",
      "@id": `${siteUrl}/#organization`,
      "name": "Hóspede Club",
      "url": siteUrl,
      "logo": ogImageUrl,
      "description":
        "Curadoria privada de estadias e hotéis com tarifas exclusivas de membro e descontos reais.",
      "priceRange": "$$",
      "areaServed": {
        "@type": "Country",
        "name": "Brasil",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-alabaster text-charcoal antialiased selection:bg-champagne selection:text-obsidian">
        {children}
      </body>
    </html>
  );
}
