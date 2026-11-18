"use client";

import type { RoomCategory } from "@/data/vellutoCatalog";
import { groupRoomOffers, priceRoomOffer } from "@/lib/roomOffers";
import { resolveRoomCancellationPolicy } from "@/lib/cancellationPolicy";
import { mealPlans } from "./HotelResultFilters";
import { LuxuryImage } from "./LuxuryImage";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function RoomOffers({ rooms, nights, checkIn, onSelect, onViewPolicy }: {
  rooms: RoomCategory[]; nights: number; checkIn: string;
  onSelect: (room: RoomCategory) => void; onViewPolicy: (room: RoomCategory) => void;
}) {
  return <div className="space-y-5">
    <p className="text-xs leading-relaxed text-[#5C646B]">Compare a alimentação e as condições de cada quarto.
      Os preços são para todos os hóspedes da pesquisa. Cada tarifa pode ter condições e promoções diferentes.</p>
    {groupRoomOffers(rooms, nights).map((group) => {
      const minimum = priceRoomOffer(group.meals[0].offers[0], nights).pix.pixPrice;
      const renderOffer = (room: RoomCategory, label: string, alternative = false) => {
        const rate = room.rates?.[0];
        const pricing = priceRoomOffer(room, nights);
        const policy = resolveRoomCancellationPolicy(room, checkIn);
        const difference = Math.round((pricing.pix.pixPrice - minimum) * 100) / 100;
        const card = pricing.creditCard.installments[11];
        return <div key={room.id} className="grid items-center gap-3 border-t border-[#EAE3D5] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#182026]">{label}</h4>
            {alternative && <p className="mt-1 text-xs text-[#5C646B]">Outra oferta para a mesma alimentação</p>}
            <p className="mt-1 text-xs text-[#5C646B]">{policy.label}</p>
            {rate?.rateType === "RECHECK" && <p className="mt-1 text-xs text-[#9A6D28]">Disponibilidade e preço sujeitos à confirmação</p>}
            {room.highlights.length > 0 && <p className="mt-1 text-xs text-[#0F5257]">{room.highlights.join(" · ")}</p>}
            <button type="button" onClick={() => onViewPolicy(room)} className="mt-2 text-xs font-medium text-[#0F5257] underline underline-offset-2">
              Ver condições de cancelamento
            </button>
          </div>
          <div className="text-left tabular-nums sm:text-right">
            <p className="text-lg font-semibold text-[#0F5257]">{money(pricing.pix.pixPrice)} <span className="text-xs font-normal">no Pix</span></p>
            <p className="text-xs text-[#5C646B]">Total de {nights} {nights === 1 ? "noite" : "noites"}</p>
            {nights > 1 && <p className="text-xs text-[#5C646B]">{money(pricing.pix.pixPrice / nights)} por noite</p>}
            <p className="mt-1 text-xs font-medium text-[#0F5257]">{difference > 0 ? `+ ${money(difference)} sobre a menor tarifa deste quarto` : "Menor preço deste quarto"}</p>
            <p className="mt-1 text-[11px] text-[#5C646B]">Cartão: até 12x de {money(card.installmentValue)}<br />Total no cartão: {money(card.totalCharged)}</p>
          </div>
          <button type="button" disabled={room.omnibeesAvailableCount <= 0}
            aria-label={`Selecionar ${label} para ${group.room.name}${alternative ? ", outra oferta" : ""}`}
            onClick={() => onSelect(room)}
            className="min-h-11 rounded-xl bg-[#B8863B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#9A6D28] disabled:bg-stone-200 disabled:text-stone-500">
            {room.omnibeesAvailableCount <= 0 ? "Indisponível" : "Selecionar"}
          </button>
        </div>;
      };
      return <article key={group.id} className="overflow-hidden rounded-2xl border border-[#E5DEC9] bg-white">
        <div className="flex gap-4 p-4 sm:p-5">
          <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-[#FAF7F2] sm:h-28 sm:w-40">
            <LuxuryImage src={group.room.heroImage || ""} alt={group.room.name} fallbackLabel={group.room.name} priority={false} className="h-full w-full" />
          </div>
          <div className="min-w-0 self-center">
            <h3 className="font-editorial text-xl text-[#182026]">{group.room.name}</h3>
            <p className="mt-1 text-xs text-[#5C646B]">{[group.room.bedConfig, group.room.viewLabel, group.room.sizeM2 > 0 ? `${group.room.sizeM2} m²` : ""].filter(Boolean).join(" · ")}</p>
            <p className="mt-2 text-xs text-[#5C646B]">{group.meals.length} {group.meals.length === 1 ? "opção de alimentação" : "opções de alimentação"}</p>
          </div>
        </div>
        {group.meals.map((meal) => {
          const label = mealPlans[meal.code] || meal.offers[0].boardBasis || "Alimentação conforme a tarifa";
          return <div key={meal.code}>
            {renderOffer(meal.offers[0], label)}
            {meal.offers.length > 1 && <details className="border-t border-[#EAE3D5] bg-[#FAF7F2]/50">
              <summary className="cursor-pointer px-5 py-3 text-xs font-medium text-[#0F5257]">Ver outras {meal.offers.length - 1} {meal.offers.length === 2 ? "tarifa" : "tarifas"} — {label}</summary>
              {meal.offers.slice(1).map((offer) => renderOffer(offer, label, true))}
            </details>}
          </div>;
        })}
        <p className="border-t border-[#EAE3D5] px-5 py-3 text-[11px] text-[#5C646B]">Confira impostos, taxas locais e observações da oferta antes do pagamento.</p>
      </article>;
    })}
  </div>;
}
