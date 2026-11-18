"use client";
import { resizeGuestAges } from "@/lib/guestAges";

export function GuestAgeFields({ childrenCount, infantsCount, childAges = [], infantAges = [], onChange }: {
  childrenCount: number; infantsCount: number; childAges?: number[]; infantAges?: number[];
  onChange: (childAges: number[], infantAges: number[]) => void;
}) {
  if (!childrenCount && !infantsCount) return null;
  return <fieldset className="mt-3 space-y-2">
    <legend className="text-xs font-medium">Idade de cada criança na data de entrada</legend>
    <div className="flex flex-wrap gap-3">
      {([{ count: childrenCount, ages: childAges, min: 6, max: 17, label: "Criança", child: true },
        { count: infantsCount, ages: infantAges, min: 0, max: 5, label: "Infantil", child: false }]).flatMap((group) =>
        resizeGuestAges(group.ages, group.count).map((age, index) => <label key={`${group.label}-${index}`} className="text-xs">
          {group.label} {index + 1}
          <select required aria-label={`Idade de ${group.label.toLowerCase()} ${index + 1}`} value={age < 0 ? "" : age}
            className="ml-2 rounded-lg border border-[#E2D9C8] bg-[#FAF7F2] px-2 py-2"
            onChange={(event) => {
              const next = resizeGuestAges(group.ages, group.count);
              next[index] = Number(event.target.value);
              onChange(group.child ? next : childAges, group.child ? infantAges : next);
            }}>
            <option value="" disabled>Selecione</option>
            {Array.from({ length: group.max - group.min + 1 }, (_, i) => group.min + i)
              .map((value) => <option key={value} value={value}>{value} {value === 1 ? "ano" : "anos"}</option>)}
          </select>
        </label>))}
    </div>
  </fieldset>;
}
