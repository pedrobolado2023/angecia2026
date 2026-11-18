"use client";

import { ChevronLeft, ChevronRight, Check, Images } from "lucide-react";
import { LuxuryImage } from "./LuxuryImage";

export function HotelOverview({ name, category, photos, activePhoto, onPhotoChange, description, facilities }: {
  name: string; category: string; photos: string[]; activePhoto: number;
  onPhotoChange: (index: number) => void; description?: string; facilities: string[];
}) {
  const photoIndex = activePhoto < photos.length ? activePhoto : 0;
  return <section aria-label={`Fotos e informações de ${name}`} className="mb-6 grid gap-4 lg:grid-cols-2 lg:gap-6">
    <div className="min-w-0">
      <div className="relative h-52 overflow-hidden rounded-2xl border border-[#E5DEC9] bg-white sm:h-64 lg:h-72">
        <LuxuryImage src={photos[photoIndex] || ""} alt={name} fallbackLabel={name} priority className="h-full w-full" />
        {photos.length > 1 && <>
          <button type="button" aria-label="Foto anterior" onClick={() => onPhotoChange((photoIndex + photos.length - 1) % photos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-[#182026] shadow-sm hover:bg-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Próxima foto" onClick={() => onPhotoChange((photoIndex + 1) % photos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-[#182026] shadow-sm hover:bg-white">
            <ChevronRight className="h-4 w-4" />
          </button>
        </>}
        {photos.length > 0 && <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-[#182026]/80 px-2 py-1 text-xs text-white">
          <Images className="h-3.5 w-3.5" />{photoIndex + 1} / {photos.length}
        </span>}
      </div>
      {photos.length > 1 && <div aria-label="Miniaturas das fotos" className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo, index) => <button key={`${photo}-${index}`} type="button" aria-label={`Ver foto ${index + 1} de ${name}`}
          aria-pressed={photoIndex === index} onClick={() => onPhotoChange(index)}
          className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 sm:h-14 sm:w-20 ${photoIndex === index ? "border-[#B8863B]" : "border-transparent opacity-70 hover:opacity-100"}`}>
          <LuxuryImage src={photo} alt={`${name}, foto ${index + 1}`} className="h-full w-full" />
        </button>)}
      </div>}
    </div>
    <div className="min-w-0 rounded-2xl border border-[#E5DEC9] bg-white p-4 sm:p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#9A6D28]">{category || "Hospedagem"}</p>
      <h2 className="mt-1 text-base font-semibold text-[#182026]">Sobre o hotel</h2>
      {description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#5C646B]">{description}</p>}
      {facilities.length > 0 && <div className="mt-4 border-t border-[#F0EAE0] pt-3">
        <h3 className="text-xs font-semibold text-[#182026]">A hospedagem oferece</h3>
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-xs text-[#465058] sm:grid-cols-2">
          {facilities.slice(0, 4).map((facility, index) => <li key={index} className="flex min-w-0 items-start gap-1.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F5257]" /><span className="line-clamp-2">{facility}</span>
          </li>)}
        </ul>
      </div>}
      {(description || facilities.length > 0) && <details className="group mt-4 border-t border-[#F0EAE0] pt-3">
        <summary className="cursor-pointer text-xs font-medium text-[#0F5257] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#0F5257]">
          Saiba mais sobre o hotel
        </summary>
        <div tabIndex={0} aria-label="Informações completas do hotel" className="mt-3 max-h-64 space-y-3 overflow-y-auto overscroll-contain pr-2 text-sm leading-relaxed text-[#465058]">
          {description && <p className="whitespace-pre-line">{description}</p>}
          {facilities.length > 0 && <ul className="space-y-2 border-t border-[#F0EAE0] pt-3">
            {facilities.map((facility, index) => <li key={index} className="flex items-start gap-2">
              <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[#0F5257]" /><span>{facility}</span>
            </li>)}
          </ul>}
        </div>
      </details>}
      <a href="#quartos-disponiveis" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0F5257] hover:underline">
        Ver quartos e tarifas <ChevronRight className="h-3.5 w-3.5" />
      </a>
    </div>
  </section>;
}
