/** Empty / whitespace-only strings become `null` for optional text columns. */
export function optionalTextToNull(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}
