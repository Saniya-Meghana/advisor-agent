import { createClient } from '@supabase/supabase-js';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type Document } from '../_shared/types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Mock classifier and metadata extraction functions (replace with actual logic)
async function classifyRisk(text: string): Promise<{ risk_type: string; severity: string; domain: string; tags: string[] }> {
    if (text.toLowerCase().includes('kyc') || text.toLowerCase().includes('aml')) {
        return { risk_type: 'KYC/AML', severity: 'High', domain: 'Financial', tags: ['KYC', 'AML'] };
    }
    if (text.toLowerCase().includes('digital payments') || text.toLowerCase().includes('fraud')) {
        return { risk_type: 'Digital Payments', severity: 'Medium', domain: 'Financial', tags: ['Digital Payments', 'Fraud'] };
    }
    if (text.toLowerCase().includes('gdpr') || text.toLowerCase().includes('privacy')) {
        return { risk_type: 'Data Privacy', severity: 'High', domain: 'Data Privacy', tags: ['GDPR', 'Privacy'] };
    }
    if (text.toLowerCase().includes('lending norms')) {
        return { risk_type: 'Lending Norms', severity: 'Medium', domain: 'Financial', tags: ['Lending'] };
    }
    return { risk_type: 'General Compliance', severity: 'Low', domain: 'General', tags: [] };
}

function extractMetadata(text: string): { source: string; date: string | null; title: string } {
    const sourceMatch = text.match(/(RBI|GDPR|SOX)/i);
    const dateMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/); // YYYY-MM-DD
    const titleMatch = text.match(/Circular on (.*?)(?:,|\n|\.)/i) || text.match(/(.*?)(?:circular|guidelines|regulations)/i);

    const source = sourceMatch ? sourceMatch[1].toUpperCase() : 'Unknown';
    const date = dateMatch ? dateMatch[1] : null;
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Document';

    return { source, date, title };
}

async function generateSummary(text: string): Promise<string> {
    const words = text.split(' ');
    const summary = words.slice(0, Math.min(words.length, 50)).join(' ') + (words.length > 50 ? '...' : '');
    return `Summary of compliance implications: ${summary}`;
}

// Supabase Edge Function handler
serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { doc_id, text_content, download_link } = await req.json();

        if (!doc_id || !text_content) {
            return new Response(JSON.stringify({ error: 'Missing doc_id or text_content' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        // 1. Risk Classification
        const { risk_type, severity, domain, tags } = await classifyRisk(text_content);

        // 2. Metadata Extraction
        const { source, date, title } = extractMetadata(text_content);

        // 3. Summary
        const summary = await generateSummary(text_content);

        // 4. Embedding (Placeholder - typically done by an embedding model)
        const embedding = `vector_for_${doc_id}`;

        // 5. Dashboard Sync: Format output for Supabase insertion
        const complianceDoc: Document = {
            doc_id: doc_id,
            title: title,
            source: source,
            date: date,
            domain: domain,
            risk_type: risk_type,
            severity: severity,
            summary: summary,
            embedding: embedding,
            created_at: new Date().toISOString(),
            tags: tags,
            download_link: download_link
        };

        // Insert into compliance_docs table
        const { data, error } = await supabase
            .from('compliance_docs')
            .insert([complianceDoc]);

        if (error) {
            console.error('Error inserting into Supabase:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        return new Response(JSON.stringify({ message: 'Document processed and synced', data: complianceDoc }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: unknown) {
        console.error('Error processing document:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
