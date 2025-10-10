import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, FileText, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface ComplianceReport {
  id: string;
  document_id: string;
  risk_level: string;
  compliance_score: number;
  issues_detected: unknown; // JSONB from database
  recommendations: unknown; // JSONB from database
  analysis_summary: string;
  generated_at: string;
  documents: {
    original_name: string;
  };
}

const ComplianceReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('compliance_reports')
        .select(`
          *,
          documents!inner(original_name)
        `)
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
    } catch (error: unknown) {
      console.error('Error fetching compliance reports:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance reports",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return <Badge className="bg-green-500">Low Risk</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500">Medium Risk</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-500">High Risk</Badge>;
      case 'CRITICAL':
        return <Badge variant="destructive">Critical Risk</Badge>;
      default:
        return <Badge variant="outline">{riskLevel}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return <Badge variant="outline" className="text-green-600">Low</Badge>;
      case 'MEDIUM':
        return <Badge variant="outline" className="text-yellow-600">Medium</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="text-orange-600">High</Badge>;
      case 'CRITICAL':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return <Badge variant="outline" className="text-blue-600">Low Priority</Badge>;
      case 'MEDIUM':
        return <Badge variant="outline" className="text-yellow-600">Medium Priority</Badge>;
      case 'HIGH':
        return <Badge variant="outline" className="text-red-600">High Priority</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const exportReport = async (report: ComplianceReport) => {
    try {
      const { data, error } = await supabase.functions.invoke('export-report', {
        body: {
          report_ids: [report.id],
          format: 'pdf',
          include_charts: true
        }
      });

      if (error) throw error;

      // Create download link
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Report exported",
        description: "Professional compliance report has been generated and downloaded",
      });
    } catch (error: unknown) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: (error as Error).message || "Failed to export compliance report",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading compliance reports...</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No compliance reports</h3>
        <p className="text-muted-foreground">
          Upload and analyze documents to generate compliance reports
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {reports.map((report) => (
        <Card key={report.id} className="card-elevated">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {report.documents.original_name}
                </CardTitle>
                <CardDescription className="mt-1">
                  Generated on {format(new Date(report.generated_at), 'MMM dd, yyyy at h:mm a')}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportReport(report)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Risk Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Risk Level</h4>
                {getRiskBadge(report.risk_level)}
              </div>
              <div>
                <h4 className="font-medium mb-2">Compliance Score</h4>
                <div className="flex items-center gap-3">
                  <Progress value={report.compliance_score} className="flex-1" />
                  <span className="font-bold text-lg">{report.compliance_score}%</span>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div>
              <h4 className="font-medium mb-2">Analysis Summary</h4>
              <p className="text-muted-foreground">{report.analysis_summary}</p>
            </div>

            {/* Detailed Analysis */}
            <Accordion type="multiple" className="w-full">
              {/* Issues Detected */}
              {report.issues_detected && Array.isArray(report.issues_detected) && report.issues_detected.length > 0 && (
                <AccordionItem value="issues">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Issues Detected ({report.issues_detected.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {report.issues_detected.map((issue: any, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium">{issue.category}</h5>
                            {getSeverityBadge(issue.severity)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {issue.description}
                          </p>
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm font-medium mb-1">Recommendation:</p>
                            <p className="text-sm">{issue.recommendation}</p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Recommendations */}
              {report.recommendations && Array.isArray(report.recommendations) && report.recommendations.length > 0 && (
                <AccordionItem value="recommendations">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Action Recommendations ({report.recommendations.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {report.recommendations.map((rec: any, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(rec.priority)}
                            </div>
                            <Badge variant="outline">{rec.timeline}</Badge>
                          </div>
                          <p className="text-sm font-medium mb-1">Action Required:</p>
                          <p className="text-sm">{rec.action}</p>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ComplianceReports;