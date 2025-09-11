import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, File, CheckCircle } from 'lucide-react';
import { addAuditLog } from "@/lib/auditLogger";

interface DocumentUploadProps {
  onUploadComplete?: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const acceptedTypes = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/csv': '.csv',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
  };

  const handleFileSelect = (files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        return false;
      }
      if (!Object.keys(acceptedTypes).includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    const newUploadFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending' as const
    }));

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    if (!user) return;

    try {
      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
      ));

      const fileName = `${user.id}/${Date.now()}-${uploadFile.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadFile.file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 50 } : f
      ));

      const { data: documentData, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          filename: fileName,
          original_name: uploadFile.file.name,
          file_type: uploadFile.file.type,
          file_size: uploadFile.file.size,
          storage_path: uploadData.path,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // ✅ Audit log for upload
      await addAuditLog({
        userId: user.id,
        action: "document_uploaded",
        resource_type: "document",
        resource_id: documentData.id,
        description: `Uploaded ${uploadFile.file.name}`,
        risk_level: "low",
      });

      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 75, status: 'processing' } : f
      ));

      await triggerComplianceAnalysis(documentData.id);

      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? { ...f, progress: 100, status: 'completed' } : f
      ));

      toast({
        title: "Upload successful",
        description: `${uploadFile.file.name} has been uploaded and queued for analysis`,
      });

      onUploadComplete?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id ? {
          ...f,
          status: 'error',
          error: error.message || 'Upload failed'
        } : f
      ));
      toast({
        title: "Upload failed",
        description: error.message || 'Failed to upload file',
        variant: "destructive",
      });
    }
  };

  const triggerComplianceAnalysis = async (documentId: string) => {
    try {
      const { error } = await supabase.functions.invoke('analyze-compliance', {
        body: { document_id: documentId }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Failed to trigger compliance analysis:', error);
    }
  };

  const removeFile = (id: string) => setUploadFiles(prev => prev.filter(f => f.id !== id));

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); };

  const getFileIcon = (fileType: string) => fileType.includes('pdf') ? <FileText className="h-5 w-5" /> : <File className="h-5 w-5" />;
  const getStatusBadge = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'uploading': return <Badge variant="outline">Uploading</Badge>;
      case 'processing': return <Badge variant="outline">Processing</Badge>;
      case 'completed': return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className={`border-2 border-dashed transition-colors cursor-pointer ${
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
      }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className={`h-12 w-12 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <h3 className="text-lg font-medium mb-2">Upload Documents</h3>
          <p className="text-muted-foreground text-center mb-4">
            Drag and drop files here, or click to select files<br />
            Supported: PDF, DOCX, DOC, CSV, XLS, XLSX (Max 10MB)
          </p>
          <Button variant="outline">Choose Files</Button>
        </CardContent>
      </Card>

     <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.values(acceptedTypes).join(',')}
        className="hidden"
        aria-label="Upload documents"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
      />


      {uploadFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Upload Progress</h3>
          {uploadFiles.map((fileItem) => (
            <Card key={fileItem.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {getFileIcon(fileItem.file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(fileItem.status)}
                  {fileItem.status === 'pending' && (
                    <Button size="sm" onClick={() => uploadFile(fileItem)}>Upload</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeFile(fileItem.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(fileItem.status === 'uploading' || fileItem.status === 'processing') && (
                <div className="mt-2"><Progress value={fileItem.progress} className="h-2" /></div>
              )}
              {fileItem.error && (
                <div className="mt-2"><p className="text-xs text-destructive">{fileItem.error}</p></div>
              )}
            </Card>
          ))}
          <Button
            onClick={() => uploadFiles.filter(f => f.status === 'pending').forEach(file => uploadFile(file))}
            disabled={!uploadFiles.some(f => f.status === 'pending')}
            className="w-full"
          >
            Upload All Pending Files
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
