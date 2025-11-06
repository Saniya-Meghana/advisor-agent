import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  AlertTriangle,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Shield,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MetricCard {
  title: string;
  value: number;
  change?: number;
  icon: any;
  trend?: 'up' | 'down';
}

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!roles || !roles.some(r => r.role === 'admin')) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      await loadDashboardData();
    };

    checkAdminAccess();
  }, [navigate, toast]);

  const loadDashboardData = async () => {
    try {
      // Get document count
      const { count: docCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });

      // Get reports count
      const { count: reportCount } = await supabase
        .from('compliance_reports')
        .select('*', { count: 'exact', head: true });

      // Get high-risk reports count
      const { count: highRiskCount } = await supabase
        .from('compliance_reports')
        .select('*', { count: 'exact', head: true })
        .in('risk_level', ['HIGH', 'CRITICAL']);

      // Get user count
      const { data: profiles, count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get recent audit logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*, profiles!inner(full_name, email)')
        .order('timestamp', { ascending: false })
        .limit(10);

      setMetrics([
        {
          title: "Total Documents",
          value: docCount || 0,
          change: 12,
          trend: 'up',
          icon: FileText,
        },
        {
          title: "Compliance Reports",
          value: reportCount || 0,
          change: 8,
          trend: 'up',
          icon: Shield,
        },
        {
          title: "High-Risk Flags",
          value: highRiskCount || 0,
          change: -5,
          trend: 'down',
          icon: AlertTriangle,
        },
        {
          title: "Active Users",
          value: userCount || 0,
          change: 3,
          trend: 'up',
          icon: Users,
        },
      ]);

      setRecentActivity(logs || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Activity className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and activity monitoring</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {metrics.map((metric, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
              {metric.change !== undefined && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  )}
                  <span className={metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                    {Math.abs(metric.change)}%
                  </span>
                  <span className="ml-1">from last month</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.profiles?.full_name || log.profiles?.email} • {log.resource_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
