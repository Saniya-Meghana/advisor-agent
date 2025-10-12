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
  user_id: string; // Added for RLS and audit trail
  title: string;
  source: string;
  date: string | null;
  domain: string;
  risk_type: string;
  severity: string;
  compliance_score?: number; // Added for dashboard metrics
  summary: string;
  embedding: string; // Assuming it's a string representation for now
  created_at: string;
  tags: string[];
  download_link?: string; // Optional download link
  review_required?: boolean; // For high-risk flagging
}

export interface FcmToken {
  user_id: string;
  fcm_token: string;
  created_at: string;
}

export interface UserActivityLog {
  log_id?: string; // Supabase will auto-generate
  user_id: string;
  action_type: 'upload' | 'download' | 'analyze' | 'review'; // Specific actions
  document_id?: string; // Optional: if action relates to a document
  details?: Record<string, any>; // Additional context
  timestamp: string;
}
