import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentViewerProps {
  documentId: string;
  reportData?: any;
}

interface EntityHighlight {
  entity_type: string;
  entity_category: string;
  severity: string;
  masked_value: string;
}

const DocumentViewer = ({ documentId, reportData }: DocumentViewerProps) => {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState<string>("");
  const [entities, setEntities] = useState<EntityHighlight[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityHighlight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDocument();
    loadEntities();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !document) throw new Error('Document not found');

      // Get signed URL for document
      const { data: urlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.storage_path, 3600);

      if (urlData) {
        setDocumentUrl(urlData.signedUrl);
      }

      // Get document text from embeddings
      const { data: embeddings } = await supabase
        .from('document_embeddings')
        .select('chunk_text')
        .eq('document_id', documentId)
        .order('chunk_index');

      if (embeddings) {
        const fullText = embeddings.map(e => e.chunk_text).join('\n\n');
        setDocumentText(fullText);
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      toast({
        title: "Error",
        description: "Failed to load document",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadEntities = async () => {
    try {
      const { data, error } = await supabase
        .from('entity_extractions')
        .select('*')
        .eq('document_id', documentId)
        .order('severity', { ascending: false });

      if (error) throw error;
      setEntities(data || []);
    } catch (error) {
      console.error('Failed to load entities:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'pii': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'phi': return 'bg-red-100 text-red-800 border-red-300';
      case 'financial': return 'bg-green-100 text-green-800 border-green-300';
      case 'confidential': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-96">
          <FileText className="h-8 w-8 animate-pulse" />
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Document Content */}
      <Card className="lg:col-span-2 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Content
          </h3>
          {documentUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={documentUrl} download>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>

        <ScrollArea className="h-[600px]">
          {documentUrl && documentUrl.endsWith('.pdf') ? (
            <iframe
              src={documentUrl}
              className="w-full h-full min-h-[600px] border rounded"
              title="Document PDF"
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">{documentText}</pre>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Risk Highlights & Entities */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Detected Entities ({entities.length})
        </h3>

        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {entities.map((entity, idx) => (
              <div
                key={idx}
                className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedEntity === entity ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedEntity(entity)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getEntityTypeColor(entity.entity_type)}>
                    {entity.entity_type.toUpperCase()}
                  </Badge>
                  <div className={`h-2 w-2 rounded-full ${getSeverityColor(entity.severity)}`} />
                </div>

                <p className="text-sm font-medium mb-1">{entity.entity_category}</p>
                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                  {entity.masked_value || '****'}
                </p>

                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-muted-foreground">Severity:</span>
                  <span className="font-medium capitalize">{entity.severity}</span>
                </div>
              </div>
            ))}

            {entities.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sensitive entities detected
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Issue Summary from Report */}
        {reportData && reportData.issues_detected && reportData.issues_detected.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Compliance Issues ({reportData.issues_detected.length})</h4>
            <div className="space-y-2">
              {reportData.issues_detected.slice(0, 3).map((issue: any, idx: number) => (
                <div key={idx} className="text-xs p-2 bg-muted rounded">
                  <p className="font-medium">{issue.title}</p>
                  <Badge variant="outline" className="mt-1">
                    {issue.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DocumentViewer;
