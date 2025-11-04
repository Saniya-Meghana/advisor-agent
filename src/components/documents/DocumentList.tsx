import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { addAuditLog } from "@/lib/auditLogger";

interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  upload_date: string;
  processing_status: string;
  created_at: string;
  ocr_required?: boolean;
  ocr_attempted?: boolean;
  ocr_completed?: boolean;
  compliance_reports?: Array<{
    risk_level: string;
    compliance_score: number;
  }>;
}

interface DocumentListProps {
  onDocumentChange?: () => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ onDocumentChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          compliance_reports(risk_level, compliance_score)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error: unknown) {
      console.error('Error fetching documents:', error);
      toast({ title: "Error", description: "Failed to load documents", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, [user]);

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(doc.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started", description: `${doc.original_name} is downloading` });
    } catch (error: unknown) {
      console.error('Download error:', error);
      toast({ title: "Download failed", description: (error as Error).message || 'Failed to download document', variant: "destructive" });
    }
  };

  const deleteDocument = async (doc: Document) => {
    try {
      const { error: storageError } = await supabase.storage.from('documents').remove([doc.storage_path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id);
      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      onDocumentChange?.();
      toast({ title: "Document deleted", description: `${doc.original_name} has been removed` });

      // ✅ Audit log for delete
      if (user) {
        await addAuditLog({
          userId: user.id,
          action: "document_deleted",
          resource_type: "document",
          resource_id: doc.id,
          description: `Deleted ${doc.original_name}`,
          risk_level: "medium",
        });
      }
    } catch (error: unknown) {
      console.error('Delete error:', error);
      toast({ title: "Delete failed", description: (error as Error).message || 'Failed to delete document', variant: "destructive" });
    }
  };

  const retryAnalysis = async (doc: Document) => {
    try {
      // Check if document requires OCR
      const shouldUseOCR = doc.ocr_required && !doc.ocr_completed;
      const latestReport = doc.compliance_reports?.[0];
      const analysisFailed = latestReport && 
        latestReport.risk_level === 'CRITICAL' && 
        latestReport.compliance_score < 30;
      
      if (shouldUseOCR || analysisFailed) {
        // Trigger OCR first, which will then trigger analysis
        const { error: ocrError } = await supabase.functions.invoke('ocr-document', { 
          body: { document_id: doc.id } 
        });
        
        if (ocrError) throw ocrError;
        
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, processing_status: 'processing', ocr_required: true } : d
        ));
        toast({ 
          title: "OCR processing started", 
          description: `${doc.original_name} is being reprocessed with OCR` 
        });
      } else {
        // Regular retry - analyze-document will handle fetching the document
        const { error: analyzeError } = await supabase.functions.invoke('analyze-document', { 
          body: { document_id: doc.id } 
        });
        
        if (analyzeError) throw analyzeError;
        
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, processing_status: 'pending' } : d
        ));
        toast({ 
          title: "Analysis queued", 
          description: `${doc.original_name} has been queued for re-analysis` 
        });
      }

      // ✅ Audit log for re-analysis
      if (user) {
        await addAuditLog({
          userId: user.id,
          action: "document_reanalyzed",
          resource_type: "document",
          resource_id: doc.id,
          description: `Re-analysis triggered for ${doc.original_name} ${shouldUseOCR || analysisFailed ? '(with OCR)' : ''}`,
          risk_level: "low",
        });
      }
    } catch (error: unknown) {
      console.error('Retry analysis error:', error);
      toast({ title: "Failed to retry", description: (error as Error).message || 'Failed to queue document for analysis', variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'processing': return <Badge variant="outline" className="flex items-center gap-1"><div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />Processing</Badge>;
      case 'completed': return <Badge variant="default" className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Completed</Badge>;
      case 'error': return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Error</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading documents...</p>
      </div>
    </div>
  );

  if (documents.length === 0) return (
    <Card className="p-8 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">No documents uploaded</h3>
      <p className="text-muted-foreground">Upload your first document to get started with compliance analysis</p>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{doc.original_name}</span>
                </div>
              </TableCell>
              <TableCell><Badge variant="outline">{doc.file_type.split('/')[1]?.toUpperCase() || 'FILE'}</Badge></TableCell>
              <TableCell>{formatFileSize(doc.file_size)}</TableCell>
              <TableCell>{getStatusBadge(doc.processing_status)}</TableCell>
              <TableCell>{format(new Date(doc.upload_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => downloadDocument(doc)}><Download className="h-4 w-4" /></Button>
                  {(() => {
                    // Show retry button if:
                    // 1. Processing failed/errored
                    // 2. Document needs OCR (ocr_required but not completed)
                    // 3. Analysis failed (critical risk + low score)
                    const hasFailed = doc.processing_status === 'failed' || doc.processing_status === 'error';
                    const needsOCR = doc.ocr_required && !doc.ocr_completed;
                    const latestReport = doc.compliance_reports?.[0];
                    const analysisFailed = latestReport && 
                      latestReport.risk_level === 'CRITICAL' && 
                      latestReport.compliance_score < 30;
                    
                    const shouldShowRetry = hasFailed || needsOCR || analysisFailed;
                    
                    if (!shouldShowRetry) return null;
                    
                    return (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                        onClick={() => retryAnalysis(doc)}
                        title={needsOCR || analysisFailed ? "Retry with OCR" : "Retry analysis"}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {needsOCR || analysisFailed ? "Retry OCR" : "Retry"}
                      </Button>
                    );
                  })()}
                  <Button size="sm" variant="ghost" onClick={() => deleteDocument(doc)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DocumentList;
