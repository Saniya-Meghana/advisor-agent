export function assertIsRecord(value: unknown, name = "value"): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

export async function parseJsonSafely(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export interface Document {
  doc_id: string;
  title: string;
  source: string;
  date: string | null;
  domain: string;
  risk_type: string;
  severity: string;
  summary: string;
  embedding: string; // Assuming it's a string representation for now
  created_at: string;
  tags: string[];
  download_link?: string; // Optional download link
}
