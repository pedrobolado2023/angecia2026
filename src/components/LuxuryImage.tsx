"use client";

import React, { useState, useEffect, useRef } from "react";
import { Building2 } from "lucide-react";

interface LuxuryImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  theme?: "beach" | "mountain" | "rio" | "villa" | "thermal";
  priority?: boolean;
}

export function LuxuryImage({
  src,
  alt,
  className = "",
  fallbackLabel,
  priority = true,
}: LuxuryImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Efeito para verificar imediatamente se a imagem já está em cache
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-[#FAF7F2] select-none ${className}`}>
      {/* Skeleton Shimmer Neutro & Discreto (sem ilustrações de desenho/mock) */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#F5EFE6] via-[#FAF7F2] to-[#F5EFE6] animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#B8863B]/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[#B8863B]/40" />
          </div>
        </div>
      )}

      {/* Fallback elegante apenas se a URL da foto falhar (404) */}
      {hasError ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#FAF7F2] text-[#9A6D28] p-4 text-center">
          <div className="w-9 h-9 rounded-full bg-[#B8863B]/12 flex items-center justify-center mb-1.5">
            <Building2 className="w-4 h-4 text-[#9A6D28]" />
          </div>
          <span className="text-xs font-medium text-[#182026] line-clamp-1">
            {fallbackLabel || alt}
          </span>
          <span className="text-[10px] text-[#5C646B] mt-0.5">Curadoria Hóspede Club</span>
        </div>
      ) : (
        <img
          ref={(el) => {
            imgRef.current = el;
            if (el && el.complete && el.naturalWidth > 0 && !isLoaded) {
              setIsLoaded(true);
            }
          }}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // @ts-expect-error fetchpriority attribute
          fetchpriority={priority ? "high" : "auto"}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`relative z-10 w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
