import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type Document, type UserActivityLog } from '../_shared/types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- Helper Functions to Invoke Other Edge Functions ---
async function invokeLogAuditEvent(logEntry: Omit<UserActivityLog, 'log_id' | 'timestamp'>) {
  const { error } = await supabase.functions.invoke('log-audit-event', { body: logEntry });
  if (error) console.error('Error invoking log-audit-event:', error);
}

async function invokeSendFCM(notification: { user_id: string; title: string; message: string; document_id: string; type: string; }) {
    const { error } = await supabase.functions.invoke('send-fcm-notification', { body: notification });
    if (error) console.error('Error invoking send-fcm-notification:', error);
}

// --- Mock Business Logic (remains unchanged) ---
interface ClassificationResult {
    risk_type: string; severity: string; domain: string; tags: string[];
    compliance_score: number; review_required: boolean;
}

function classifyRisk(text: string): ClassificationResult {
    let risk_type = 'General Compliance', severity = 'Low', domain = 'General', compliance_score = 80, review_required = false, tags = [];
    if (text.toLowerCase().includes('kyc') || text.toLowerCase().includes('aml')) {
        risk_type = 'KYC/AML'; severity = 'High'; domain = 'Financial'; tags = ['KYC', 'AML']; compliance_score = 30; review_required = true;
    } else if (text.toLowerCase().includes('gdpr') || text.toLowerCase().includes('privacy')) {
        risk_type = 'Data Privacy'; severity = 'High'; domain = 'Data Privacy'; tags = ['GDPR', 'Privacy']; compliance_score = 20; review_required = true;
    }
    return { risk_type, severity, domain, tags, compliance_score, review_required };
}

function extractMetadata(text: string, downloadLink: string) {
    return { title: `Document from ${downloadLink.substring(0, 50)}...`, source: new URL(downloadLink).hostname, date: new Date().toISOString() };
}

function generateSummary(text: string): string {
    const words = text.split(' ');
    return words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : '');
}

// --- Main Server Logic ---
serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    let userId = 'unknown', docId = 'unknown';

    try {
        const { doc_id, user_id, text_content, download_link } = await req.json();
        userId = user_id; docId = doc_id;

        if (!doc_id || !user_id || !text_content || !download_link) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        await invokeLogAuditEvent({ user_id, action_type: 'upload', document_id: doc_id, details: { status: 'processing' } });

        const classification = classifyRisk(text_content);
        const metadata = extractMetadata(text_content, download_link);
        const summary = generateSummary(text_content);
        const embedding = Array(384).fill(0);

        const complianceReport: Document = {
            doc_id, user_id, summary, embedding: JSON.stringify(embedding),
            created_at: new Date().toISOString(), download_link, ...classification, ...metadata
        };

        const { data, error } = await supabase.from('compliance_reports').insert([complianceReport]).select();

        if (error) {
            await invokeLogAuditEvent({ user_id, action_type: 'analyze', document_id: doc_id, details: { status: 'failed', error: error.message } });
            return new Response(JSON.stringify({ error: `DB Error: ${error.message}` }), { status: 500 });
        }

        if (classification.review_required) {
            await invokeSendFCM({ user_id, title: 'High-Risk Document', message: `Review required for \"${metadata.title}\"`, document_id: doc_id, type: 'high_risk_alert' });
        }

        await invokeLogAuditEvent({ user_id, action_type: 'analyze', document_id: doc_id, details: { status: 'success' } });

        return new Response(JSON.stringify({ data: data[0] }), { status: 200 });

    } catch (e: any) {
        console.error('Error processing document:', e);
        await invokeLogAuditEvent({ user_id: userId, action_type: 'analyze', document_id: docId, details: { status: 'failed', error: e.message } });
        await invokeSendFCM({ user_id: userId, title: 'Analysis Failed', message: `Processing failed for document ${docId}`, document_id: docId, type: 'analysis_failed' });
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
