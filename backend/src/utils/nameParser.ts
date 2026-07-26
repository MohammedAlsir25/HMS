export interface StructuredName {
  family: string;
  given: string[];
  prefix?: string;
}

export function parseFullName(fullName: string): StructuredName {
  const parts = (fullName || '').trim().split(/\s+/);
  if (parts.length === 0) return { family: '', given: [] };
  if (parts.length === 1) return { family: parts[0]!, given: [] };
  if (parts.length === 2) return { family: parts[1]!, given: [parts[0]!] };
  const prefix = ['mr', 'mrs', 'ms', 'dr', 'prof'].includes(parts[0]!.toLowerCase()) ? parts[0] : undefined;
  const givenStart = prefix ? 1 : 0;
  const family = parts[parts.length - 1]!;
  const given = parts.slice(givenStart, parts.length - 1);
  return { family, given, prefix };
}

export function formatStructuredName(name: StructuredName): string {
  const parts: string[] = [];
  if (name.prefix) parts.push(name.prefix);
  parts.push(...name.given);
  parts.push(name.family);
  return parts.join(' ');
}
