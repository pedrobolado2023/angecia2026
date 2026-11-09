"use client";

import React, { useState } from "react";

interface LuxuryImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  theme?: "beach" | "mountain" | "rio" | "villa" | "thermal";
}

function getThemeFromText(text: string): "beach" | "mountain" | "rio" | "villa" | "thermal" {
  const t = text.toLowerCase();
  if (t.includes("rio") || t.includes("conrado") || t.includes("copacabana") || t.includes("angra")) {
    return "rio";
  }
  if (
    t.includes("gramado") ||
    t.includes("vinhedos") ||
    t.includes("campos") ||
    t.includes("mantiqueira") ||
    t.includes("serra") ||
    t.includes("château") ||
    t.includes("cabana")
  ) {
    return "mountain";
  }
  if (t.includes("quente") || t.includes("thermas") || t.includes("caldas") || t.includes("olímpia")) {
    return "thermal";
  }
  if (t.includes("villa") || t.includes("mansão") || t.includes("quadrado") || t.includes("trancoso")) {
    return "villa";
  }
  return "beach";
}

export function LuxuryImage({
  src,
  alt,
  className = "",
  fallbackLabel,
  theme,
}: LuxuryImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const resolvedTheme = theme || getThemeFromText(`${alt} ${fallbackLabel || ""} ${src}`);

  return (
    <div className={`relative overflow-hidden bg-[#E8F2F6] select-none ${className}`}>
      {/* Base Instantânea (0ms): Ilustração Solar Diurna de Alto Padrão (Riviera & Resort Daylight) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {resolvedTheme === "rio" && (
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="rioDaySky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#65B8E6" />
                <stop offset="55%" stopColor="#B8E3FA" />
                <stop offset="100%" stopColor="#FDF3DF" />
              </linearGradient>
              <linearGradient id="rioDaySea" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0E8A9E" />
                <stop offset="50%" stopColor="#1CAEC2" />
                <stop offset="100%" stopColor="#5CD1DF" />
              </linearGradient>
            </defs>
            <rect width="800" height="500" fill="url(#rioDaySky)" />
            {/* Sol Radiante da Manhã Carioca */}
            <circle cx="610" cy="125" r="80" fill="#FFF6D6" fillOpacity="0.65" />
            <circle cx="610" cy="125" r="44" fill="#FFE494" fillOpacity="0.95" />
            {/* Montanhas Verdes Iluminadas (Pedra da Gávea / Dois Irmãos) */}
            <path
              d="M0 305 L95 215 L170 235 L250 150 L325 158 L400 265 L485 200 L565 275 L670 225 L750 285 L800 270 L800 330 L0 330 Z"
              fill="#3A6E6C"
              fillOpacity="0.85"
            />
            <path
              d="M70 315 L195 225 L295 285 L430 195 L540 290 L800 275 L800 330 L0 330 Z"
              fill="#2B5856"
              fillOpacity="0.7"
            />
            {/* Faixa de Areia Clara de São Conrado / Ipanema */}
            <path d="M0 312 Q 400 298 800 316 L 800 335 L 0 335 Z" fill="#F8EBD2" />
            {/* Mar Azul-Turquesa & Piscina de Borda Infinita */}
            <rect x="0" y="318" width="800" height="182" fill="url(#rioDaySea)" />
            {/* Reflexos de Sol na Água */}
            <ellipse cx="610" cy="348" rx="145" ry="7" fill="#FFF8E1" fillOpacity="0.7" />
            <ellipse cx="610" cy="370" rx="95" ry="4" fill="#FFFFFF" fillOpacity="0.6" />
            {/* Deck de Mármore Travertino Claro na Borda Infinita */}
            <path d="M0 420 L800 398 L800 500 L0 500 Z" fill="#F7F1E5" />
            <line x1="0" y1="420" x2="800" y2="398" stroke="#C59B4E" strokeWidth="3" />
          </svg>
        )}

        {resolvedTheme === "mountain" && (
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="mtnDaySky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ECAE6" />
                <stop offset="55%" stopColor="#D8EFFA" />
                <stop offset="100%" stopColor="#FCEFDC" />
              </linearGradient>
            </defs>
            <rect width="800" height="500" fill="url(#mtnDaySky)" />
            <circle cx="200" cy="120" r="58" fill="#FFE699" fillOpacity="0.85" />
            {/* Colinas Verdes e Azuladas da Serra Gaúcha / Vale dos Vinhedos */}
            <path d="M0 335 L180 165 L370 300 L560 140 L760 310 L800 280 L800 500 L0 500 Z" fill="#5B8266" />
            <path d="M110 365 L320 205 L510 345 L690 210 L800 325 L800 500 L0 500 Z" fill="#3F664D" />
            {/* Gramado & Jardim Solar */}
            <rect x="0" y="385" width="800" height="115" fill="#769E6B" />
            {/* Château / Hotel Boutique Claro e Elegante */}
            <polygon points="315,335 400,250 485,335" fill="#8C5A3C" stroke="#D4AF6A" strokeWidth="2" />
            <rect x="340" y="335" width="120" height="75" fill="#FAF3E8" stroke="#C59B4E" strokeWidth="1.5" />
            <rect x="360" y="352" width="28" height="36" rx="4" fill="#FFE194" stroke="#B8863B" strokeWidth="1" />
            <rect x="412" y="352" width="28" height="36" rx="4" fill="#FFE194" stroke="#B8863B" strokeWidth="1" />
          </svg>
        )}

        {resolvedTheme === "beach" && (
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="nordesteDaySky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4EB5E6" />
                <stop offset="60%" stopColor="#B3E6FC" />
                <stop offset="100%" stopColor="#FFF7E6" />
              </linearGradient>
              <linearGradient id="turquoiseDaySea" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0BB5C4" />
                <stop offset="55%" stopColor="#2CD4D9" />
                <stop offset="100%" stopColor="#8CEBE6" />
              </linearGradient>
            </defs>
            <rect width="800" height="500" fill="url(#nordesteDaySky)" />
            <circle cx="640" cy="115" r="56" fill="#FFE58F" fillOpacity="0.9" />
            {/* Águas Cristalinas Turquesa de Maragogi / Porto de Galinhas / Trancoso */}
            <rect x="0" y="265" width="800" height="235" fill="url(#turquoiseDaySea)" />
            {/* Bancos de Areia Branca Pé na Areia */}
            <path d="M0 395 Q 240 355 480 405 T 800 380 L 800 500 L 0 500 Z" fill="#FAF0DC" />
            {/* Bangalô Claro Pé na Areia */}
            <polygon points="170,280 270,215 370,280" fill="#C89D66" stroke="#FFFFFF" strokeWidth="2" />
            <rect x="195" y="280" width="150" height="58" fill="#FFFDF9" stroke="#D4B07B" strokeWidth="1.5" />
            <rect x="218" y="294" width="38" height="32" fill="#82D8E6" />
            <rect x="282" y="294" width="38" height="32" fill="#82D8E6" />
          </svg>
        )}

        {(resolvedTheme === "villa" || resolvedTheme === "thermal") && (
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="villaDaySky" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7CC6EB" />
                <stop offset="55%" stopColor="#D4F0FC" />
                <stop offset="100%" stopColor="#FAF3E6" />
              </linearGradient>
            </defs>
            <rect width="800" height="500" fill="url(#villaDaySky)" />
            <circle cx="650" cy="110" r="55" fill="#FFE694" fillOpacity="0.9" />
            {/* Vegetação Tropical Solar */}
            <path d="M0 330 Q 200 260 420 320 T 800 295 L 800 365 L 0 365 Z" fill="#689F77" />
            {/* Arquitetura Contemporânea Branca & Madeira Clara da Villa */}
            <rect x="130" y="205" width="400" height="130" rx="4" fill="#FFFFFF" stroke="#D4B483" strokeWidth="2" />
            <rect x="120" y="198" width="420" height="12" rx="2" fill="#C59B4E" />
            <rect x="160" y="228" width="150" height="90" rx="3" fill="#99DFEC" />
            <rect x="335" y="228" width="165" height="90" rx="3" fill="#B5EBF5" />
            {/* Deck Claro & Piscina Cristalina */}
            <rect x="0" y="335" width="800" height="165" fill="#F5EDE0" />
            <polygon
              points="110,355 610,355 710,480 45,480"
              fill="#22C1D6"
              stroke="#FFFFFF"
              strokeWidth="3"
            />
          </svg>
        )}
      </div>

      {/* Imagem Fotográfica Real sobreposta quando disponível */}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`relative z-10 w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
