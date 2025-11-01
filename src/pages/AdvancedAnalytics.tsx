import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Radar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdvancedAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [radarData, setRadarData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch deployment events
      const { data: deployments } = await supabase
        .from("deployment_events")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: true });

      // Fetch risk assessments
      const { data: assessments } = await supabase
        .from("risk_assessments")
        .select("*")
        .eq("user_id", user?.id);

      // Fetch compliance reports
      const { data: reports } = await supabase
        .from("compliance_reports")
        .select("*")
        .eq("user_id", user?.id);

      // Generate heatmap data (24 hours x 7 days)
      const heatmap = Array(7).fill(0).map(() => Array(24).fill(0));
      deployments?.forEach(dep => {
        const date = new Date(dep.created_at);
        const day = date.getDay();
        const hour = date.getHours();
        heatmap[day][hour]++;
      });
      setHeatmapData(heatmap);

      // Generate radar chart data (multi-dimensional risk analysis)
      const avgRiskScore = assessments?.length 
        ? assessments.reduce((sum, a) => sum + a.overall_risk_score, 0) / assessments.length 
        : 0;

      const avgComplianceScore = reports?.length
        ? reports.reduce((sum, r) => sum + (r.compliance_score || 0), 0) / reports.length
        : 0;

      const deploymentFrequency = deployments?.length || 0;
      const rollbackRate = deployments?.filter(d => d.event_type === "rollback").length || 0;
      const highSeverityCount = deployments?.filter(d => d.severity === "error").length || 0;

      setRadarData({
        labels: [
          "Risk Score",
          "Compliance",
          "Deployment Freq",
          "Stability",
          "Security",
          "Quality"
        ],
        datasets: [{
          label: "Current State",
          data: [
            Math.min(100, avgRiskScore),
            avgComplianceScore,
            Math.min(100, deploymentFrequency * 5),
            Math.max(0, 100 - (rollbackRate * 10)),
            Math.max(0, 100 - (highSeverityCount * 10)),
            Math.max(0, 100 - avgRiskScore)
          ],
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          borderColor: "rgb(99, 102, 241)",
          borderWidth: 2,
        }]
      });

      // Generate trend data
      const last30Days = Array(30).fill(0).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
      });

      const deploymentTrend = last30Days.map(date => {
        return deployments?.filter(d => d.created_at.startsWith(date)).length || 0;
      });

      setTrendData({
        labels: last30Days.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: "Deployments",
          data: deploymentTrend,
          borderColor: "rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          fill: true,
          tension: 0.4,
        }]
      });

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHeatColor = (value: number) => {
    if (value === 0) return "bg-gray-100";
    if (value <= 2) return "bg-blue-200";
    if (value <= 5) return "bg-blue-400";
    if (value <= 10) return "bg-blue-600";
    return "bg-blue-800";
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
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Deep insights with heatmaps, radar charts, and trend analysis
        </p>
      </div>

      {/* Radar Chart - Multi-dimensional Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Dimensional Risk Analysis</CardTitle>
          <CardDescription>
            Comprehensive view of your governance health across all dimensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {radarData && (
            <div className="h-[400px] flex items-center justify-center">
              <Radar
                data={radarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                    }
                  },
                  plugins: {
                    legend: {
                      position: "top",
                    },
                  },
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Activity Heatmap</CardTitle>
          <CardDescription>
            Visualize deployment patterns across days and hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex gap-1">
                <div className="w-12" />
                {hours.map(hour => (
                  <div key={hour} className="w-8 text-xs text-center text-muted-foreground">
                    {hour}
                  </div>
                ))}
              </div>
              {days.map((day, dayIdx) => (
                <div key={day} className="flex gap-1 mt-1">
                  <div className="w-12 text-xs flex items-center text-muted-foreground">
                    {day}
                  </div>
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={`w-8 h-8 rounded ${getHeatColor(heatmapData[dayIdx]?.[hour] || 0)}`}
                      title={`${day} ${hour}:00 - ${heatmapData[dayIdx]?.[hour] || 0} deployments`}
                    />
                  ))}
                </div>
              ))}
              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="w-4 h-4 bg-gray-100 rounded" />
                <div className="w-4 h-4 bg-blue-200 rounded" />
                <div className="w-4 h-4 bg-blue-400 rounded" />
                <div className="w-4 h-4 bg-blue-600 rounded" />
                <div className="w-4 h-4 bg-blue-800 rounded" />
                <span>More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Deployment Trend</CardTitle>
          <CardDescription>
            Track deployment velocity and patterns over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendData && (
            <div className="h-[300px]">
              <Line
                data={trendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "top",
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
