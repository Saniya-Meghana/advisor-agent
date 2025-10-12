import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'; // CORRECTED: Direct URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type Document } from '../_shared/types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!; // Note: usually not needed for server-side functions
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Mock functions for classification and extraction (replace with actual logic)
interface ClassificationResult {
    risk_type: string;
    severity: string;
    domain: string;
    tags: string[];
    review_required?: boolean;
}

function classifyRisk(text: string): ClassificationResult {
    // This is a mock. In a real scenario, you'd use your trained model or LLM.
    if (text.toLowerCase().includes('kyc') || text.toLowerCase().includes('aml')) {
        return { risk_type: 'KYC/AML', severity: 'High', domain: 'Financial', tags: ['KYC', 'AML'], review_required: true };
    }
    if (text.toLowerCase().includes('digital payments') || text.toLowerCase().includes('fraud')) {
        return { risk_type: 'Digital Payments', severity: 'Medium', domain: 'Financial', tags: ['Digital Payments', 'Fraud'] };
    }
    if (text.toLowerCase().includes('gdpr') || text.toLowerCase().includes('privacy')) {
        return { risk_type: 'Data Privacy', severity: 'High', domain: 'Data Privacy', tags: ['GDPR', 'Privacy'], review_required: true };
    }
    if (text.toLowerCase().includes('lending norms')) {
        return { risk_type: 'Lending Norms', severity: 'Medium', domain: 'Financial', tags: ['Lending'] };
    }
    return { risk_type: 'General Compliance', severity: 'Low', domain: 'General', tags: [] };
}

interface MetadataResult {
    title: string;
    source: string;
    date: string; // ISO 8601 format
}

function extractMetadata(text: string, downloadLink: string): MetadataResult {
    // Mock extraction. Use regex or LLM for real extraction.
    const titleMatch = text.match(/#\s*(.*?)(\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : `Document from ${downloadLink.substring(0, 50)}...`;

    const sourceMatch = downloadLink.match(/https?:\/\/(.*?)\.org/);
    const source = sourceMatch ? sourceMatch[1].toUpperCase() : 'UNKNOWN';

    const dateMatch = text.match(/Date:\s*(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    return { title, source, date };
}

function generateSummary(text: string): string {
    // Mock summary. Use an LLM for real summary generation.
    return `This document broadly covers compliance implications related to its content. Further analysis required for specific details.`;
}

// Main Edge Function handler
serve(async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { doc_id, text_content, download_link } = await req.json();

        if (!doc_id || !text_content || !download_link) {
            return new Response(JSON.stringify({ error: 'Missing required fields: doc_id, text_content, download_link' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 1. Risk Classification & Severity Assessment
        const classification = classifyRisk(text_content);

        // 2. Metadata Extraction
        const metadata = extractMetadata(text_content, download_link);

        // 3. Summary
        const summary = generateSummary(text_content);

        // 4. Embedding (Placeholder - integrate your embedding model here)
        const embedding: number[] = new Array(384).fill(0); // Mock embedding for now

        // 5. Dashboard Sync: Format output for Supabase insertion
        const complianceDoc: Document = {
            doc_id,
            title: metadata.title,
            source: metadata.source,
            date: metadata.date,
            domain: classification.domain,
            risk_type: classification.risk_type,
            severity: classification.severity,
            summary,
            embedding, // Make sure your Supabase table has a 'vector' column of dimension 384
            created_at: new Date().toISOString(),
            tags: classification.tags,
            review_required: classification.review_required || false,
        };

        const { data, error } = await supabase.from('compliance_docs').insert([complianceDoc]).select();

        if (error) {
            console.error('Supabase insertion error:', error);
            return new Response(JSON.stringify({ error: `Failed to insert document: ${error.message}` }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({
            message: 'Document processed and synced successfully',
            data: data[0],
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: unknown) {
        console.error('Error processing document:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});

{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    python3
    (python3.withPackages (ppkgs: with ppkgs; [
      transformers
      datasets
      accelerate
      torch
      scikit-learn # Added scikit-learn
    ]))
    supabase-cli # Added supabase-cli here
  ];
}