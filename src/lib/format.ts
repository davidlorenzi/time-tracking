/**
 * Italian-style number (1.234,5), computed by hand: `Intl` groups 4-digit numbers
 * differently on Node and in browsers, which breaks hydration.
 */
export function formatNumber(value: number, maxDecimals = 2): string {
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [int, dec = ""] = rounded.toFixed(maxDecimals).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = dec.replace(/0+$/, "");
  const sign = value < 0 && rounded !== 0 ? "-" : "";
  return `${sign}${grouped}${decimals ? `,${decimals}` : ""}`;
}

export function formatMoney(value: number): string {
  return `${formatNumber(value, 0)} €`;
}

export function formatHours(value: number): string {
  return `${formatNumber(value, 2)}h`;
}

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonthTitle(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });
}
