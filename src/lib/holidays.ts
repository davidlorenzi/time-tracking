/** Italian national holidays (fixed + Easter Monday), as YYYY-MM-DD. */

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const FIXED: [number, number, string][] = [
  [1, 1, "Capodanno"],
  [1, 6, "Epifania"],
  [4, 25, "Festa della Liberazione"],
  [5, 1, "Festa del Lavoro"],
  [6, 2, "Festa della Repubblica"],
  [8, 15, "Ferragosto"],
  [11, 1, "Ognissanti"],
  [12, 8, "Immacolata Concezione"],
  [12, 25, "Natale"],
  [12, 26, "Santo Stefano"],
];

export function italianHolidays(year: number): Map<string, string> {
  const map = new Map<string, string>();
  for (const [m, d, name] of FIXED) {
    map.set(`${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, name);
  }
  const easter = easterSunday(year);
  map.set(iso(easter), "Pasqua");
  const monday = new Date(easter);
  monday.setDate(easter.getDate() + 1);
  map.set(iso(monday), "Lunedì dell'Angelo");
  return map;
}
