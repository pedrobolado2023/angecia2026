"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

export const mealPlans: Record<string, string> = {
  RO: "Só acomodação",
  BB: "Café da manhã incluído",
  HB: "Meia pensão",
  FB: "Pensão completa",
  AI: "Tudo incluído",
};

export type HotelFilters = {
  stars: string[];
  regions: string[];
  meals: string[];
  maxPrice: string;
  savedOnly: boolean;
};

export const emptyHotelFilters: HotelFilters = {
  stars: [], regions: [], meals: [], maxPrice: "", savedOnly: false,
};

export type FilterOption = { value: string; label: string; count: number };

const groups = [
  ["stars", "Classificação do alojamento"],
  ["regions", "Bairro ou região"],
  ["meals", "Regime de alimentação"],
] as const;

export function HotelResultFilters({ filters, options, onChange }: {
  filters: HotelFilters;
  options: Record<"stars" | "regions" | "meals", FilterOption[]>;
  onChange: (filters: HotelFilters) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = filters.stars.length + filters.regions.length + filters.meals.length +
    Number(Boolean(filters.maxPrice)) + Number(filters.savedOnly);

  return (
    <aside aria-label="Filtros de hotéis" className="self-start rounded-2xl border border-[#E5DEC9] bg-white">
      <button type="button" aria-expanded={expanded} aria-controls="hotel-result-filter-options"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold lg:hidden"
        onClick={() => setExpanded(!expanded)}>
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-[#9A6D28]" />
        Filtrar hotéis {activeCount > 0 && `(${activeCount})`}
      </button>
      <div id="hotel-result-filter-options" className={`${expanded ? "block" : "hidden"} divide-y divide-[#EFE8DB] px-4 lg:block`}>
        <div className="flex items-center justify-between gap-2 py-3">
          <h2 className="hidden text-sm font-semibold lg:block">Filtrar hotéis</h2>
          <button type="button" disabled={!activeCount} onClick={() => onChange(emptyHotelFilters)}
            className="text-xs font-semibold text-[#0F5257] underline disabled:opacity-40">
            Limpar filtros
          </button>
        </div>
        {groups.map(([key, label]) => options[key].length > 0 && (
          <fieldset key={key} className="py-4">
            <legend className="float-left mb-2 w-full text-sm font-semibold text-[#182026]">{label}</legend>
            {key === "meals" && (
              <p className="clear-both mb-2 text-xs text-[#5C646B]">Mostra hotéis que oferecem o regime escolhido. Confira o valor em Ver Tarifas.</p>
            )}
            <div className="clear-both max-h-48 space-y-1 overflow-y-auto pr-1">
              {options[key].map(({ value, label: optionLabel, count }) => (
                <label key={value} className="flex min-h-8 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={filters[key].includes(value)}
                    disabled={count === 0}
                    className="h-4 w-4 shrink-0 accent-[#0F5257]"
                    onChange={(event) => onChange({
                      ...filters,
                      [key]: event.target.checked ? [...filters[key], value] : filters[key].filter((item) => item !== value),
                    })} />
                  <span className="flex-1">{optionLabel}</span>
                  <span aria-label={`${count} ${count === 1 ? "hotel" : "hotéis"}`} className="text-xs tabular-nums text-[#5C646B]">{count}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="py-4">
          <label className="block text-sm font-semibold">
            Preço máximo no Pix (R$)
            <input type="number" min="0" step="1" placeholder="Sem limite" value={filters.maxPrice}
              onChange={(event) => onChange({ ...filters, maxPrice: event.target.value })}
              className="mt-2 w-full rounded-lg border border-[#E2D9C8] bg-[#FAF7F2] px-3 py-2 text-sm font-normal" />
          </label>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#0F5257]" checked={filters.savedOnly}
            onChange={(event) => onChange({ ...filters, savedOnly: event.target.checked })} />
          Somente hotéis salvos
        </label>
      </div>
    </aside>
  );
}
