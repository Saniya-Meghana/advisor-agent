import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import DocumentUpload from '@/components/documents/DocumentUpload';
import DocumentList from '@/components/documents/DocumentList';
import ComplianceReports from '@/components/compliance/ComplianceReports';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalDocuments: number;
  pendingAnalysis: number;
  highRiskIssues: number;
  avgComplianceScore: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    pendingAnalysis: 0,
    highRiskIssues: 0,
    avgComplianceScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      // Fetch document stats
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id, processing_status')
        .eq('user_id', user.id);

      if (docsError) throw docsError;

      // Fetch compliance reports stats
      const { data: reports, error: reportsError } = await supabase
        .from('compliance_reports')
        .select('risk_level, compliance_score')
        .eq('user_id', user.id);

      if (reportsError) throw reportsError;

      const pendingDocs = documents?.filter(doc => doc.processing_status === 'pending').length || 0;
      const highRiskReports = reports?.filter(report => report.risk_level === 'HIGH').length || 0;
      const avgScore = reports?.length 
        ? Math.round(reports.reduce((sum, report) => sum + report.compliance_score, 0) / reports.length)
        : 0;

      setStats({
        totalDocuments: documents?.length || 0,
        pendingAnalysis: pendingDocs,
        highRiskIssues: highRiskReports,
        avgComplianceScore: avgScore
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [user]);

  const refreshStats = () => {
    fetchDashboardStats();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Risk & Compliance Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your compliance status and manage risk assessments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                Documents uploaded
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Analysis</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAnalysis}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.highRiskIssues}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Compliance Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgComplianceScore}%</div>
              <Progress value={stats.avgComplianceScore} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Compliance Reports
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Document Management</CardTitle>
                <CardDescription>
                  View and manage your uploaded compliance documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentList onDocumentChange={refreshStats} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Compliance Analysis Reports</CardTitle>
                <CardDescription>
                  Review AI-generated compliance assessments and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComplianceReports />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload PDF, DOCX, or CSV files for compliance analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUpload onUploadComplete={refreshStats} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;