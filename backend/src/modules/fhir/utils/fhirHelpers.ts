import { Response } from 'express';

export interface FhirResource {
  resourceType: string;
  id: string;
  meta?: { lastUpdated: string };
  [key: string]: unknown;
}

export function fhirResponse(res: Response, resource: FhirResource, acceptHeader?: string) {
  if (acceptHeader?.includes('application/fhir+xml')) {
    const xml = jsonToFhirXml(resource);
    res.setHeader('Content-Type', 'application/fhir+xml');
    return res.send(xml);
  }
  res.setHeader('Content-Type', 'application/fhir+json');
  return res.json(resource);
}

export function fhirError(res: Response, status: number, code: string, diagnostics: string) {
  const outcome = {
    resourceType: 'OperationOutcome',
    issue: [{ severity: 'error', code, diagnostics }],
  };
  return res.status(status).json(outcome);
}

export function fhirBundle(entries: FhirResource[], total: number): FhirResource {
  return {
    resourceType: 'Bundle',
    id: crypto.randomUUID(),
    meta: { lastUpdated: new Date().toISOString() },
    type: 'searchset',
    total,
    entry: entries.map(e => ({ resource: e, fullUrl: `urn:uuid:${e.id}` })),
  };
}

export function toFhirId(id: string): string {
  return id.replace(/-/g, '');
}

export function fromFhirId(fhirId: string): string {
  if (fhirId.length === 32) {
    return `${fhirId.slice(0, 8)}-${fhirId.slice(8, 12)}-${fhirId.slice(12, 16)}-${fhirId.slice(16, 20)}-${fhirId.slice(20)}`;
  }
  return fhirId;
}

function jsonToFhirXml(resource: FhirResource): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${resource.resourceType} xmlns="http://hl7.org/fhir">\n`;
  xml += `  <id value="${resource.id}"/>\n`;
  if (resource.meta) {
    xml += `  <meta><lastUpdated value="${resource.meta.lastUpdated}"/></meta>\n`;
  }
  for (const [key, value] of Object.entries(resource)) {
    if (['resourceType', 'id', 'meta'].includes(key)) continue;
    xml += serializeXmlField(key, value);
  }
  xml += `</${resource.resourceType}>`;
  return xml;
}

function serializeXmlField(name: string, value: unknown, indent = 2): string {
  const pad = ' '.repeat(indent);
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${pad}<${name} value="${String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')}"/>\n`;
  }
  if (Array.isArray(value)) {
    return value.map(v => serializeXmlField(name, v, indent)).join('');
  }
  if (typeof value === 'object') {
    let xml = `${pad}<${name}>\n`;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      xml += serializeXmlField(k, v, indent + 2);
    }
    xml += `${pad}</${name}>\n`;
    return xml;
  }
  return '';
}
