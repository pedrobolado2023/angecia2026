import type { RoomCategory } from "../data/vellutoCatalog";
import { calculateVellutoPricing } from "./pricingEngine";

export function priceRoomOffer(room: RoomCategory, nights: number) {
  const rate = room.rates?.[0];
  // A API informa o total da estadia: calcular antes de dividir evita arredondar cada diária.
  return calculateVellutoPricing(rate?.net ?? room.netRate * nights, rate?.sellingRate ?? room.barRate * nights,
    0.15, 0, 0, rate ? (rate.hotelMandatory ? rate.sellingRate : undefined) :
      room.mandatorySellingRate === undefined ? undefined : room.mandatorySellingRate * nights);
}

export function groupRoomOffers(rooms: RoomCategory[], nights: number) {
  const groups = new Map<string, { id: string; room: RoomCategory; meals: Map<string, RoomCategory[]> }>();
  const seen = new Set<string>();
  for (const room of rooms) {
    const id = room.hotelbedsRoomCode || room.id;
    const rate = room.rates?.[0];
    // Apenas uma rateKey idêntica é repetição comprovada. Não unir códigos de quarto diferentes.
    const identity = JSON.stringify([id, rate?.rateKey || room.id]);
    if (seen.has(identity)) continue;
    seen.add(identity);
    if (!groups.has(id)) groups.set(id, { id, room, meals: new Map() });
    const group = groups.get(id)!;
    const meal = rate?.boardCode || room.boardBasis;
    if (!group.meals.has(meal)) group.meals.set(meal, []);
    group.meals.get(meal)!.push(room);
  }
  const price = (room: RoomCategory) => priceRoomOffer(room, nights).pix.pixPrice;
  return [...groups.values()].map((group) => ({ ...group,
    meals: [...group.meals].map(([code, offers]) => ({ code,
      offers: [...offers].sort((a, b) => price(a) - price(b)),
    })).sort((a, b) => price(a.offers[0]) - price(b.offers[0])),
  })).sort((a, b) => price(a.meals[0].offers[0]) - price(b.meals[0].offers[0]));
}
