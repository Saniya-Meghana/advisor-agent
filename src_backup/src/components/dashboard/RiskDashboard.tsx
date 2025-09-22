import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Bell
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface DashboardData {
  totalDocuments: number;
  highRiskDocuments: number;
  mediumRiskDocuments: number;
  lowRiskDocuments: number;
  pendingAnalyses: number;
  averageRiskScore: number;
  recentAnalyses: any[];
  complianceByRegulation: any[];
  riskTrends: any[];
  topRedFlags: any[];
  unreadNotifications: number;
}

const COLORS = ['#ef4444', '#f97316', '#10b981', '#6366f1'];

const RiskDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalDocuments: 0,
    highRiskDocuments: 0,
    mediumRiskDocuments: 0,
    lowRiskDocuments: 0,
    pendingAnalyses: 0,
    averageRiskScore: 0,
    recentAnalyses: [],
    complianceByRegulation: [],
    riskTrends: [],
    topRedFlags: [],
    unreadNotifications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch documents and their compliance reports
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          compliance_reports (*)
        `)
        .eq('user_id', user.id);

      if (docsError) throw docsError;

      // Fetch recent compliance reports
      const { data: recentReports, error: reportsError } = await supabase
        .from('compliance_reports')
        .select(`
          *,
          documents (original_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reportsError) throw reportsError;

      // Fetch unread notifications
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (notifError) throw notifError;

      // Process the data
      const totalDocuments = documents?.length || 0;
      const completedAnalyses = documents?.filter(doc => 
        doc.compliance_reports && doc.compliance_reports.length > 0
      ) || [];

      const riskCounts = completedAnalyses.reduce((acc, doc) => {
        const latestReport = doc.compliance_reports[doc.compliance_reports.length - 1];
        if (latestReport) {
          if (latestReport.compliance_score >= 70) acc.low++;
          else if (latestReport.compliance_score >= 40) acc.medium++;
          else acc.high++;
        }
        return acc;
      }, { high: 0, medium: 0, low: 0 });

      const averageScore = completedAnalyses.length > 0 
        ? completedAnalyses.reduce((sum, doc) => {
            const latestReport = doc.compliance_reports[doc.compliance_reports.length - 1];
            return sum + (latestReport?.compliance_score || 0);
          }, 0) / completedAnalyses.length
        : 0;

      // Prepare compliance by regulation data
      const regulationCounts: Record<string, number> = Record<string, unknown>;
      const regulationScores: Record<string, number[]> = Record<string, unknown>;
      
      completedAnalyses.forEach(doc => {
        const latestReport = doc.compliance_reports[doc.compliance_reports.length - 1];
        if (latestReport?.regulation_template_id) {
          const regId = latestReport.regulation_template_id;
          regulationCounts[regId] = (regulationCounts[regId] || 0) + 1;
          if (!regulationScores[regId]) regulationScores[regId] = [];
          regulationScores[regId].push(latestReport.compliance_score);
        }
      });

      // Create risk trends (mock data for now - would be real historical data)
      const riskTrends = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        highRisk: Math.floor(Math.random() * 10),
        mediumRisk: Math.floor(Math.random() * 15),
        lowRisk: Math.floor(Math.random() * 20)
      }));

      // Extract top red flags
      const allRedFlags: Record<string, number> = Record<string, unknown>;
      completedAnalyses.forEach(doc => {
        const latestReport = doc.compliance_reports[doc.compliance_reports.length - 1];
        if (latestReport?.issues_detected) {
          const issues = Array.isArray(latestReport.issues_detected) 
            ? latestReport.issues_detected 
            : [];
          issues.forEach((issue: string) => {
            allRedFlags[issue] = (allRedFlags[issue] || 0) + 1;
          });
        }
      });

      const topRedFlags = Object.entries(allRedFlags)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([flag, count]) => ({ flag, count }));

      setDashboardData({
        totalDocuments,
        highRiskDocuments: riskCounts.high,
        mediumRiskDocuments: riskCounts.medium,
        lowRiskDocuments: riskCounts.low,
        pendingAnalyses: totalDocuments - completedAnalyses.length,
        averageRiskScore: Math.round(averageScore),
        recentAnalyses: recentReports || [],
        complianceByRegulation: Object.entries(regulationCounts).map(([id, count]) => ({
          regulation: id,
          count,
          averageScore: regulationScores[id]?.reduce((a, b) => a + b, 0) / regulationScores[id]?.length || 0
        })),
        riskTrends,
        topRedFlags,
        unreadNotifications: notifications?.length || 0
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'Low', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 40) return { level: 'Medium', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { level: 'High', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const pieData = [
    { name: 'High Risk', value: dashboardData.highRiskDocuments, color: '#ef4444' },
    { name: 'Medium Risk', value: dashboardData.mediumRiskDocuments, color: '#f97316' },
    { name: 'Low Risk', value: dashboardData.lowRiskDocuments, color: '#10b981' },
    { name: 'Pending', value: dashboardData.pendingAnalyses, color: '#6b7280' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Risk & Compliance Dashboard</h1>
          <p className="text-muted-foreground">Monitor compliance status and risk across your documents</p>
        </div>
        {dashboardData.unreadNotifications > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            {dashboardData.unreadNotifications} notifications
          </Badge>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.pendingAnalyses} pending analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Documents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardData.highRiskDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Risk Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.averageRiskScore}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskLevel(dashboardData.averageRiskScore).bg} ${getRiskLevel(dashboardData.averageRiskScore).color}`}>
                {getRiskLevel(dashboardData.averageRiskScore).level} Risk
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.totalDocuments > 0 
                ? Math.round(((dashboardData.lowRiskDocuments + dashboardData.mediumRiskDocuments) / dashboardData.totalDocuments) * 100)
                : 0}%
            </div>
            <Progress 
              value={dashboardData.totalDocuments > 0 
                ? ((dashboardData.lowRiskDocuments + dashboardData.mediumRiskDocuments) / dashboardData.totalDocuments) * 100
                : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="regulations">By Regulation</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Breakdown of documents by risk level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        dataKey="value"
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Red Flags</CardTitle>
                <CardDescription>Most common compliance issues found</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.topRedFlags.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium">{item.flag}</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                  {dashboardData.topRedFlags.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No red flags detected!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Trends</CardTitle>
              <CardDescription>Risk levels over the past 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.riskTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="highRisk" stroke="#ef4444" name="High Risk" />
                    <Line type="monotone" dataKey="mediumRisk" stroke="#f97316" name="Medium Risk" />
                    <Line type="monotone" dataKey="lowRisk" stroke="#10b981" name="Low Risk" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regulations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance by Regulation</CardTitle>
              <CardDescription>Analysis breakdown by regulation type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.complianceByRegulation.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{item.regulation}</h3>
                      <p className="text-sm text-muted-foreground">{item.count} documents analyzed</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{Math.round(item.averageScore)}</div>
                      <div className={`text-xs px-2 py-1 rounded-full ${getRiskLevel(item.averageScore).bg} ${getRiskLevel(item.averageScore).color}`}>
                        {getRiskLevel(item.averageScore).level} Risk
                      </div>
                    </div>
                  </div>
                ))}
                {dashboardData.complianceByRegulation.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>No regulation-specific analyses yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Analyses</CardTitle>
              <CardDescription>Latest compliance reports and their findings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentAnalyses.map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{analysis.documents?.original_name || 'Unknown Document'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold">{analysis.compliance_score}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${getRiskLevel(analysis.compliance_score).bg} ${getRiskLevel(analysis.compliance_score).color}`}>
                          {getRiskLevel(analysis.compliance_score).level} Risk
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Report
                      </Button>
                    </div>
                  </div>
                ))}
                {dashboardData.recentAnalyses.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2" />
                    <p>No recent analyses</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskDashboard;