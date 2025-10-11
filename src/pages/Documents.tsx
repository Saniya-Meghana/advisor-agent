import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentUpload from "@/components/documents/DocumentUpload";
import DocumentList from "@/components/documents/DocumentList";
import ComplianceReports from "@/components/compliance/ComplianceReports";
import ProtectedRoute from "@/components/ProtectedRoute";

const Documents = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">Document Management</h1>
            <p className="text-muted-foreground max-w-prose">
              Upload documents for compliance analysis. All documents are securely stored and automatically analyzed.
            </p>
          </header>

          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload Documents</TabsTrigger>
              <TabsTrigger value="documents">My Documents</TabsTrigger>
              <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload PDF, DOCX, DOC, CSV, XLS, or XLSX files for automated compliance analysis
                  </p>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  <DocumentUpload onUploadComplete={handleUploadComplete} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle>Document Library</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    View, download, and manage your uploaded documents
                  </p>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6">
                  <DocumentList 
                    key={refreshTrigger} 
                    onDocumentChange={handleUploadComplete} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <ComplianceReports key={refreshTrigger} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </ProtectedRoute>
  );
};

export default Documents;
