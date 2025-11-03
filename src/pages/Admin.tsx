import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, FileText, AlertTriangle, TrendingUp, 
  Activity, CheckCircle, XCircle, Clock 
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface AdminMetrics {
  total_documents: number;
  total_users: number;
  total_reports: number;
  avg_compliance_score: number;
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  completed_documents: number;
  processing_documents: number;
  failed_documents: number;
}

interface UserData {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: string[];
  document_count: number;
}

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) throw error;
      
      setIsAdmin(data);
      
      if (data) {
        fetchMetrics();
        fetchUsers();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    // TODO: Create admin_compliance_metrics view
    // For now, calculate metrics from existing tables
    try {
      const { count: totalDocs } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const { data: reports } = await supabase
        .from('compliance_reports')
        .select('compliance_score, risk_level');
      
      const avgScore = reports?.length 
        ? Math.round(reports.reduce((sum, r) => sum + r.compliance_score, 0) / reports.length)
        : 0;
      
      setMetrics({
        total_documents: totalDocs || 0,
        total_users: totalUsers || 0,
        total_reports: reports?.length || 0,
        avg_compliance_score: avgScore,
        critical_risks: reports?.filter(r => r.risk_level === 'CRITICAL').length || 0,
        high_risks: reports?.filter(r => r.risk_level === 'HIGH').length || 0,
        medium_risks: reports?.filter(r => r.risk_level === 'MEDIUM').length || 0,
        low_risks: reports?.filter(r => r.risk_level === 'LOW').length || 0,
        completed_documents: 0,
        processing_documents: 0,
        failed_documents: 0,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          full_name,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get document counts and roles for each user
      const usersData = await Promise.all((profiles || []).map(async (profile) => {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.user_id);

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.user_id);

        return {
          ...profile,
          document_count: count || 0,
          roles: roles?.map(r => r.role) || []
        };
      }));

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error loading users',
        description: 'Failed to fetch user data',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            System-wide compliance and user management
          </p>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.total_users || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.total_documents || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Compliance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.avg_compliance_score || 0}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Risks</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics?.critical_risks || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Breakdown of risk levels across all reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{metrics?.critical_risks || 0}</div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div className="flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{metrics?.high_risks || 0}</div>
                <div className="text-sm text-muted-foreground">High</div>
              </div>
              <div className="flex flex-col items-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{metrics?.medium_risks || 0}</div>
                <div className="text-sm text-muted-foreground">Medium</div>
              </div>
              <div className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics?.low_risks || 0}</div>
                <div className="text-sm text-muted-foreground">Low</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle>Document Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Completed</span>
                </div>
                <Badge variant="outline">{metrics?.completed_documents || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span>Processing</span>
                </div>
                <Badge variant="outline">{metrics?.processing_documents || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Failed</span>
                </div>
                <Badge variant="outline">{metrics?.failed_documents || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Registered Users</CardTitle>
                <CardDescription>Manage system users and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((userData) => (
                    <div key={userData.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{userData.full_name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground">{userData.email}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Joined: {new Date(userData.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{userData.document_count} docs</Badge>
                        {userData.roles.map((role) => (
                          <Badge key={role} variant="secondary">{role}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent System Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Activity log will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
