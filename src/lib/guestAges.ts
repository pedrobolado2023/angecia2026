export function resizeGuestAges(ages: number[] | undefined, count: number): number[] {
  return Array.from({ length: count }, (_, index) => ages?.[index] ?? -1);
}

export function validGuestAges(children: number, infants: number, childAges: number[] = [], infantAges: number[] = []) {
  return childAges.length === children && infantAges.length === infants &&
    childAges.every((age) => Number.isInteger(age) && age >= 6 && age <= 17) &&
    infantAges.every((age) => Number.isInteger(age) && age >= 0 && age <= 5);
}
