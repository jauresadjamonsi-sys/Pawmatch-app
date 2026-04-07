/**
 * Format an age in months to a human-readable French string.
 *
 * Examples:
 *   formatAge(0)   => "0 mois"
 *   formatAge(5)   => "5 mois"
 *   formatAge(12)  => "1 an"
 *   formatAge(14)  => "1 an 2 mois"
 *   formatAge(36)  => "3 ans"
 *   formatAge(null) => ""
 */
export function formatAge(months: number | null): string {
  if (months === null || months === undefined) return "";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mois`;
  if (m === 0) return `${y} an${y > 1 ? "s" : ""}`;
  return `${y} an${y > 1 ? "s" : ""} ${m} mois`;
}
