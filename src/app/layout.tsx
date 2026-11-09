import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velluto Stays | A arte de se hospedar no extraordinário",
  description:
    "Curadoria privada de estadias de alto padrão com condições tarifárias exclusivas negociadas diretamente com a hotelaria nacional. Acesse o Velluto Private Club.",
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
      </head>
      <body className="bg-alabaster text-charcoal antialiased selection:bg-champagne selection:text-obsidian">
        {children}
      </body>
    </html>
  );
}

