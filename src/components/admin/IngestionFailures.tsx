import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface IngestionFailure {
  id: string;
  user_id: string;
  document_id: string | null;
  filename: string;
  file_type: string;
  file_size: number;
  error_type: string;
  error_message: string;
  error_details: any;
  retry_count: number;
  last_retry_at: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function IngestionFailures() {
  const { toast } = useToast();
  const [failures, setFailures] = useState<IngestionFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchFailures();
  }, [showResolved]);

  const fetchFailures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ingestion_failures')
        .select('*')
        .eq('resolved', showResolved)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setFailures(data || []);
    } catch (error) {
      console.error('Error fetching ingestion failures:', error);
      toast({
        title: 'Error loading failures',
        description: 'Failed to load ingestion failure logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const retryIngestion = async (failure: IngestionFailure) => {
    if (!failure.document_id) {
      toast({
        title: 'Cannot retry',
        description: 'No document ID associated with this failure',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Trigger OCR if it's a text extraction issue
      const needsOCR = failure.error_type === 'ocr_error' || 
                       failure.error_message.includes('text') ||
                       failure.error_message.includes('OCR');

      if (needsOCR) {
        await supabase.functions.invoke('ocr-document', {
          body: { document_id: failure.document_id }
        });
      } else {
        await supabase.functions.invoke('analyze-document', {
          body: { document_id: failure.document_id }
        });
      }

      // Update retry count
      await supabase
        .from('ingestion_failures')
        .update({ 
          retry_count: failure.retry_count + 1,
          last_retry_at: new Date().toISOString()
        })
        .eq('id', failure.id);

      toast({
        title: 'Retry initiated',
        description: `Reprocessing ${failure.filename}`,
      });

      fetchFailures();
    } catch (error) {
      console.error('Error retrying ingestion:', error);
      toast({
        title: 'Retry failed',
        description: (error as Error).message || 'Failed to retry document processing',
        variant: 'destructive',
      });
    }
  };

  const markResolved = async (failureId: string) => {
    try {
      await supabase
        .from('ingestion_failures')
        .update({ 
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', failureId);

      toast({
        title: 'Marked as resolved',
        description: 'Failure has been marked as resolved',
      });

      fetchFailures();
    } catch (error) {
      console.error('Error marking as resolved:', error);
      toast({
        title: 'Failed to update',
        description: 'Failed to mark failure as resolved',
        variant: 'destructive',
      });
    }
  };

  const getErrorTypeBadge = (errorType: string) => {
    const types: Record<string, { variant: any; label: string }> = {
      validation_error: { variant: 'destructive', label: 'Validation' },
      upload_error: { variant: 'destructive', label: 'Upload' },
      ocr_error: { variant: 'destructive', label: 'OCR' },
      analysis_error: { variant: 'destructive', label: 'Analysis' },
      storage_error: { variant: 'destructive', label: 'Storage' },
    };

    const config = types[errorType] || { variant: 'secondary', label: errorType };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Ingestion Failures
            </CardTitle>
            <CardDescription>
              Document processing errors and retry history
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Show Unresolved' : 'Show Resolved'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {failures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {showResolved ? 'No resolved failures' : 'No ingestion failures found'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Error Type</TableHead>
                <TableHead>Error Message</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failures.map((failure) => (
                <TableRow key={failure.id}>
                  <TableCell className="font-medium">
                    {failure.filename}
                    <div className="text-xs text-muted-foreground">
                      {(failure.file_size / 1024).toFixed(1)} KB • {failure.file_type}
                    </div>
                  </TableCell>
                  <TableCell>{getErrorTypeBadge(failure.error_type)}</TableCell>
                  <TableCell className="max-w-xs truncate" title={failure.error_message}>
                    {failure.error_message}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {failure.retry_count} {failure.retry_count === 1 ? 'retry' : 'retries'}
                    </Badge>
                    {failure.last_retry_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Last: {format(new Date(failure.last_retry_at), 'MMM dd, HH:mm')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(failure.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {!failure.resolved && failure.document_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => retryIngestion(failure)}
                          title="Retry processing"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {!failure.resolved && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markResolved(failure.id)}
                          title="Mark as resolved"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      {failure.resolved && (
                        <Badge variant="secondary" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}