export function formatMoney(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatHours(value: number): string {
  return `${(Math.round(value * 100) / 100).toLocaleString("it-IT")}h`;
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
