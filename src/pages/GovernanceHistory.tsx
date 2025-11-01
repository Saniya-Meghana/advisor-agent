import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface HistoricalEvent {
  id: string;
  type: "deployment" | "rollback" | "assessment" | "checklist" | "report";
  title: string;
  description: string;
  timestamp: string;
  severity: "info" | "warning" | "error" | "success";
  metadata: any;
}

interface GovernancePattern {
  pattern: string;
  frequency: number;
  lastOccurrence: string;
  recommendation: string;
}

export default function GovernanceHistory() {
  const { user } = useAuth();
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [patterns, setPatterns] = useState<GovernancePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDeployments: 0,
    totalRollbacks: 0,
    avgRiskScore: 0,
    successRate: 0,
  });

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      setLoading(true);

      // Fetch deployment events
      const { data: deployments } = await supabase
        .from("deployment_events")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch risk assessments
      const { data: assessments } = await supabase
        .from("risk_assessments")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch compliance reports
      const { data: reports } = await supabase
        .from("compliance_reports")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Transform data into unified events
      const allEvents: HistoricalEvent[] = [];

      deployments?.forEach(dep => {
        allEvents.push({
          id: dep.id,
          type: dep.event_type === "rollback" ? "rollback" : "deployment",
          title: dep.event_type === "rollback" ? "Deployment Rollback" : "Deployment Event",
          description: dep.description,
          timestamp: dep.created_at,
          severity: dep.severity as any,
          metadata: dep.metadata,
        });
      });

      assessments?.forEach(assess => {
        allEvents.push({
          id: assess.id,
          type: "assessment",
          title: assess.assessment_name,
          description: `Risk Score: ${assess.overall_risk_score} - Status: ${assess.status}`,
          timestamp: assess.created_at,
          severity: assess.overall_risk_score > 70 ? "error" : assess.overall_risk_score > 40 ? "warning" : "info",
          metadata: assess,
        });
      });

      reports?.forEach(report => {
        allEvents.push({
          id: report.id,
          type: "report",
          title: "Compliance Report Generated",
          description: `Risk Level: ${report.risk_level} - Score: ${report.compliance_score}`,
          timestamp: report.created_at,
          severity: report.risk_level === "critical" || report.risk_level === "high" ? "error" : "info",
          metadata: report,
        });
      });

      // Sort all events by timestamp
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(allEvents);

      // Calculate statistics
      const deploymentEvents = deployments || [];
      const rollbackEvents = deploymentEvents.filter(d => d.event_type === "rollback");
      const avgScore = assessments?.length 
        ? assessments.reduce((sum, a) => sum + a.overall_risk_score, 0) / assessments.length 
        : 0;

      setStats({
        totalDeployments: deploymentEvents.length,
        totalRollbacks: rollbackEvents.length,
        avgRiskScore: Math.round(avgScore),
        successRate: deploymentEvents.length > 0 
          ? Math.round(((deploymentEvents.length - rollbackEvents.length) / deploymentEvents.length) * 100)
          : 100,
      });

      // Detect patterns
      detectPatterns(allEvents);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const detectPatterns = (events: HistoricalEvent[]) => {
    const detectedPatterns: GovernancePattern[] = [];

    // Pattern 1: Frequent rollbacks
    const rollbacks = events.filter(e => e.type === "rollback");
    if (rollbacks.length > 3) {
      detectedPatterns.push({
        pattern: "Frequent Rollbacks",
        frequency: rollbacks.length,
        lastOccurrence: rollbacks[0].timestamp,
        recommendation: "Review pre-deployment testing procedures and increase test coverage",
      });
    }

    // Pattern 2: High-risk deployments
    const highRiskAssessments = events.filter(
      e => e.type === "assessment" && e.metadata.overall_risk_score > 70
    );
    if (highRiskAssessments.length > 2) {
      detectedPatterns.push({
        pattern: "High-Risk Deployments",
        frequency: highRiskAssessments.length,
        lastOccurrence: highRiskAssessments[0].timestamp,
        recommendation: "Implement more rigorous pre-deployment validation and risk mitigation strategies",
      });
    }

    // Pattern 3: Compliance issues
    const complianceIssues = events.filter(
      e => e.type === "report" && e.metadata.risk_level === "high"
    );
    if (complianceIssues.length > 2) {
      detectedPatterns.push({
        pattern: "Recurring Compliance Issues",
        frequency: complianceIssues.length,
        lastOccurrence: complianceIssues[0].timestamp,
        recommendation: "Establish compliance review process and automated compliance checks",
      });
    }

    // Pattern 4: Deployment velocity
    const recentDeployments = events.filter(
      e => e.type === "deployment" && 
      new Date(e.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    if (recentDeployments.length > 10) {
      detectedPatterns.push({
        pattern: "High Deployment Velocity",
        frequency: recentDeployments.length,
        lastOccurrence: recentDeployments[0].timestamp,
        recommendation: "Consider implementing deployment windows and batch releases to reduce operational overhead",
      });
    }

    setPatterns(detectedPatterns);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "deployment": return <TrendingUp className="h-4 w-4" />;
      case "rollback": return <AlertTriangle className="h-4 w-4" />;
      case "assessment": return <CheckCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error": return "bg-red-100 text-red-800 border-red-300";
      case "warning": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "success": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Governance History & Memory</h1>
        <p className="text-muted-foreground mt-2">
          Historical patterns and insights from your governance activities
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeployments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Rollbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalRollbacks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRiskScore}/100</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Detected Patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Patterns & Insights</CardTitle>
            <CardDescription>AI-identified governance patterns from your history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {patterns.map((pattern, idx) => (
              <div key={idx} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{pattern.pattern}</h3>
                  <Badge variant="outline">
                    Occurred {pattern.frequency} times
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last occurrence: {format(new Date(pattern.lastOccurrence), "PPP")}
                </p>
                <div className="p-3 bg-blue-50 rounded text-sm">
                  <p className="font-medium text-blue-900">Recommendation:</p>
                  <p className="text-blue-800">{pattern.recommendation}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Timeline</CardTitle>
          <CardDescription>Complete history of governance activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className={`p-4 border rounded-lg ${getSeverityColor(event.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{getEventIcon(event.type)}</div>
                    <div>
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm mt-1">{event.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs opacity-75">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.timestamp), "PPP 'at' p")}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {event.type}
                  </Badge>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No historical events found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
