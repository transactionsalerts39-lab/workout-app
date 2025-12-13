export function parseTags(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t) => t.trim()).filter(Boolean);
  return raw
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function mergeTags(existing: string[] = [], incoming: string[] = []): string[] {
  const set = new Set<string>();
  existing.forEach((t) => {
    if (t) set.add(t.trim());
  });
  incoming.forEach((t) => {
    if (t) set.add(t.trim());
  });
  return Array.from(set);
}
