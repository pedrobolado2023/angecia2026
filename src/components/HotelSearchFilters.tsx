"use client";

import { useState } from "react";
import { GuestAgeFields } from "./GuestAgeFields";
import { resizeGuestAges, validGuestAges } from "@/lib/guestAges";

export type SearchCriteria = {
  query: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  childAges?: number[];
  infantAges?: number[];
  collectionId?: string;
};

const fieldClass = "w-full rounded-lg border border-[#E2D9C8] bg-[#FAF7F2] px-3 py-2 text-sm text-[#182026]";
const guestFields = [
  { key: "adults", label: "Adultos (18+)", min: 1, max: 8 },
  { key: "children", label: "Crianças (6 a 17)", min: 0, max: 4 },
  { key: "infants", label: "Infantil (0 a 5)", min: 0, max: 4 },
] as const;

export function HotelSearchFilters({ criteria, earliestDate, onSearch }: {
  criteria: SearchCriteria;
  earliestDate: string;
  onSearch: (criteria: SearchCriteria) => void;
}) {
  const [draft, setDraft] = useState(criteria);
  const [error, setError] = useState("");

  return (
    <form className="mb-6 rounded-2xl border border-[#E5DEC9] bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const query = draft.query.trim();
        if (!query) {
          setError("Informe um destino ou hotel.");
          return;
        }
        if (draft.checkOut <= draft.checkIn) {
          setError("Escolha uma data de saída posterior à entrada.");
          return;
        }
        setError("");
        if (!validGuestAges(draft.children, draft.infants, draft.childAges, draft.infantAges)) {
          setError("Informe a idade de cada criança na data de entrada.");
          return;
        }
        onSearch({ ...draft, query });
      }}>
      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-[2fr_1.2fr_1.2fr_repeat(3,minmax(0,0.9fr))_auto]">
        <label className="col-span-2 block text-xs font-medium sm:col-span-3 lg:col-span-1">
          Destino ou hotel
          <input id="result-destination" className={fieldClass} value={draft.query} required maxLength={120}
            onChange={(event) => {
              const query = event.target.value;
              setDraft((current) => ({ ...current, query, collectionId: query.trim() === criteria.query ? criteria.collectionId : undefined }));
            }} />
        </label>
        <label className="block text-xs font-medium">
          Entrada
          <input type="date" className={fieldClass} min={earliestDate} required value={draft.checkIn}
            onChange={(event) => setDraft({ ...draft, checkIn: event.target.value })} />
        </label>
        <label className="block text-xs font-medium">
          Saída
          <input type="date" className={fieldClass} min={draft.checkIn || earliestDate} required value={draft.checkOut}
            onChange={(event) => setDraft({ ...draft, checkOut: event.target.value })} />
        </label>
        {guestFields.map(({ key, label, min, max }) => (
          <label key={key} className="block text-xs font-medium">
            {label}
            <select className={fieldClass} value={draft[key]}
              onChange={(event) => {
                const count = Number(event.target.value);
                setDraft({ ...draft, [key]: count,
                  ...(key === "children" ? { childAges: resizeGuestAges(draft.childAges, count) } : {}),
                  ...(key === "infants" ? { infantAges: resizeGuestAges(draft.infantAges, count) } : {}) });
              }}>
              {Array.from({ length: max - min + 1 }, (_, index) => index + min)
                .map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
        ))}
        <button type="submit" className="min-h-10 rounded-lg bg-[#0F5257] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123D40]">
          Pesquisar
        </button>
      </div>
      <GuestAgeFields childrenCount={draft.children} infantsCount={draft.infants} childAges={draft.childAges} infantAges={draft.infantAges}
        onChange={(childAges, infantAges) => setDraft({ ...draft, childAges, infantAges })} />
      {error && <p role="alert" className="mt-2 text-sm text-[#B83B2B]">{error}</p>}
    </form>
  );
}
