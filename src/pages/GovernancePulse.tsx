import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PulseMetrics {
  deploymentsToday: number;
  rollbacksToday: number;
  avgAccuracy: number;
  avgLatency: number;
  incompleteChecklists: number;
  overrideRequests: number;
  highRiskCount: number;
}

export default function GovernancePulse() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<PulseMetrics>({
    deploymentsToday: 0,
    rollbacksToday: 0,
    avgAccuracy: 0,
    avgLatency: 0,
    incompleteChecklists: 0,
    overrideRequests: 0,
    highRiskCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const getRiskPosture = () => {
    const { rollbacksToday, incompleteChecklists, highRiskCount } = metrics;
    
    if (rollbacksToday > 2 || highRiskCount > 2 || incompleteChecklists > 3) {
      return { level: "high", color: "destructive", emoji: "🔴" };
    }
    if (rollbacksToday > 0 || highRiskCount > 0 || incompleteChecklists > 0) {
      return { level: "medium", color: "warning", emoji: "🟡" };
    }
    return { level: "low", color: "default", emoji: "🟢" };
  };

  useEffect(() => {
    const fetchTodayMetrics = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch today's deployment events
        const { data: events, error: eventsError } = await supabase
          .from("deployment_events")
          .select("*")
          .gte("created_at", today.toISOString());

        if (eventsError) throw eventsError;

        // Calculate metrics from deployment_events (limited schema)
        // TODO: Add action, override_requested, risk_level, accuracy, latency_ms columns
        const deployments = events?.filter(e => e.event_type === "deploy").length || 0;
        const rollbacks = events?.filter(e => e.event_type === "rollback").length || 0;
        const overrides = 0; // events?.filter(e => e.override_requested).length || 0;
        const highRisk = events?.filter(e => e.severity === "high" || e.severity === "critical").length || 0;

        const avgAcc = 0; // No accuracy column yet
        const avgLat = 0; // No latency_ms column yet

        // Fetch incomplete checklists
        const { data: checklists, error: checklistError } = await supabase
          .from("checklist_items")
          .select("id")
          .eq("is_completed", false)
          .gte("created_at", today.toISOString());

        if (checklistError) throw checklistError;

        setMetrics({
          deploymentsToday: deployments,
          rollbacksToday: rollbacks,
          avgAccuracy: avgAcc,
          avgLatency: avgLat,
          incompleteChecklists: checklists?.length || 0,
          overrideRequests: overrides,
          highRiskCount: highRisk,
        });
      } catch (error: any) {
        toast({
          title: "Error fetching metrics",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTodayMetrics();

    // Realtime updates
    const channel = supabase
      .channel("pulse-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deployment_events" },
        () => fetchTodayMetrics()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklist_items" },
        () => fetchTodayMetrics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const riskPosture = getRiskPosture();

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Governance Pulse
          </h1>
          <p className="text-muted-foreground mt-1">Real-time activity and risk posture</p>
        </div>
        <Badge variant={riskPosture.color as any} className="text-lg px-4 py-2">
          {riskPosture.emoji} Risk: {riskPosture.level.toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deployments Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{metrics.deploymentsToday}</div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rollbacks Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-destructive">{metrics.rollbacksToday}</div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {metrics.avgAccuracy > 0 ? metrics.avgAccuracy.toFixed(3) : "N/A"}
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {metrics.avgLatency > 0 ? `${metrics.avgLatency.toFixed(0)}ms` : "N/A"}
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Incomplete Checklists</CardTitle>
            <CardDescription>Items pending completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">
              {metrics.incompleteChecklists}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Override Requests</CardTitle>
            <CardDescription>Today's override attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-yellow-600">
              {metrics.overrideRequests}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High Risk Deployments</CardTitle>
            <CardDescription>Critical attention needed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">
              {metrics.highRiskCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Summary</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            Today saw <strong>{metrics.deploymentsToday}</strong> deployment(s) and{" "}
            <strong>{metrics.rollbacksToday}</strong> rollback(s).{" "}
            {metrics.avgAccuracy > 0 && (
              <>
                Average accuracy held at <strong>{metrics.avgAccuracy.toFixed(3)}</strong>
                {metrics.avgLatency > 0 && (
                  <>
                    {" "}with latency at <strong>{metrics.avgLatency.toFixed(0)}ms</strong>
                  </>
                )}.{" "}
              </>
            )}
            {metrics.incompleteChecklists > 0 && (
              <>
                <strong>{metrics.incompleteChecklists}</strong> checklist item(s) are pending completion.{" "}
              </>
            )}
            {metrics.overrideRequests > 0 && (
              <>
                <strong>{metrics.overrideRequests}</strong> override request(s) were made.{" "}
              </>
            )}
            Risk posture: <strong className={`text-${riskPosture.color}`}>{riskPosture.level}</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
