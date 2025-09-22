import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, FileText, Settings, AlertTriangle, Activity, Plus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface RegulationTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  template_data: any;
  is_active: boolean;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'auditor' | 'analyst' | 'viewer';
  profiles?: {
    email: string;
    full_name: string;
  } | null;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  timestamp: string;
  details: any;
  profiles?: {
    email: string;
    full_name: string;
  } | null;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<RegulationTemplate[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<RegulationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    version: '1.0',
    template_data: ''
  });

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin role:', error);
        return;
      }

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this panel.",
          variant: "destructive",
        });
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch regulation templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('regulation_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;
      
      // Fetch profiles for user roles
      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(role => role.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);
        
        // Merge roles with profiles
        const rolesWithProfiles = rolesData.map(role => ({
          ...role,
          profiles: profilesData?.find(profile => profile.user_id === role.user_id) || null
        }));
        
        setUserRoles(rolesWithProfiles as UserRole[]);
      } else {
        setUserRoles([]);
      }

      // Fetch recent audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;
      
      // Fetch profiles for audit logs
      if (logsData && logsData.length > 0) {
        const logUserIds = logsData.map(log => log.user_id);
        const { data: logProfilesData } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', logUserIds);
        
        // Merge logs with profiles
        const logsWithProfiles = logsData.map(log => ({
          ...log,
          profiles: logProfilesData?.find(profile => profile.user_id === log.user_id) || null
        }));
        
        setAuditLogs(logsWithProfiles as AuditLog[]);
      } else {
        setAuditLogs([]);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!user) return;

    try {
      let templateData;
      try {
        templateData = JSON.parse(templateForm.template_data);
      } catch (e) {
        toast({
          title: "Invalid JSON",
          description: "Please provide valid JSON for template data",
          variant: "destructive",
        });
        return;
      }

      const templatePayload = {
        name: templateForm.name,
        description: templateForm.description,
        version: templateForm.version,
        template_data: templateData,
        created_by: user.id
      };

      let error;
      if (selectedTemplate) {
        const { error: updateError } = await supabase
          .from('regulation_templates')
          .update(templatePayload)
          .eq('id', selectedTemplate.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('regulation_templates')
          .insert(templatePayload);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Template ${selectedTemplate ? 'updated' : 'created'} successfully`,
      });

      // Log the action
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_action: selectedTemplate ? 'UPDATE_TEMPLATE' : 'CREATE_TEMPLATE',
        p_resource_type: 'regulation_template',
        p_resource_id: selectedTemplate?.id || null,
        p_details: { template_name: templateForm.name }
      });

      setTemplateForm({ name: '', description: '', version: '1.0', template_data: '' });
      setSelectedTemplate(null);
      fetchData();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: newRole as 'admin' | 'auditor' | 'analyst' | 'viewer'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      // Log the action
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_action: 'UPDATE_USER_ROLE',
        p_resource_type: 'user_role',
        p_resource_id: userId,
        p_details: { new_role: newRole }
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const toggleTemplateStatus = async (templateId: string, isActive: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('regulation_templates')
        .update({ is_active: isActive })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Template ${isActive ? 'activated' : 'deactivated'} successfully`,
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating template status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update template status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage templates, users, and system settings</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Regulation Templates</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{selectedTemplate ? 'Edit' : 'Create'} Template</DialogTitle>
                  <DialogDescription>
                    {selectedTemplate ? 'Update the' : 'Create a new'} regulation template for compliance analysis.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="e.g., GDPR Compliance"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      placeholder="Brief description of the template"
                    />
                  </div>
                  <div>
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={templateForm.version}
                      onChange={(e) => setTemplateForm({ ...templateForm, version: e.target.value })}
                      placeholder="1.0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="template_data">Template Data (JSON)</Label>
                    <Textarea
                      id="template_data"
                      value={templateForm.template_data}
                      onChange={(e) => setTemplateForm({ ...templateForm, template_data: e.target.value })}
                      placeholder='{"clauses": [], "risk_thresholds": {"low": 70, "medium": 40, "high": 0}}'
                      className="h-32 font-mono text-sm"
                    />
                  </div>
                  <Button onClick={saveTemplate} className="w-full">
                    {selectedTemplate ? 'Update' : 'Create'} Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) => toggleTemplateStatus(template.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setTemplateForm({
                          name: template.name,
                          description: template.description || '',
                          version: template.version,
                          template_data: JSON.stringify(template.template_data, null, 2)
                        });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Version {template.version} • Created {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <h2 className="text-2xl font-semibold">User Management</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>User Roles</CardTitle>
              <CardDescription>Manage user permissions and access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((userRole) => (
                    <TableRow key={userRole.id}>
                      <TableCell>
                        {userRole.profiles?.full_name || 'Unknown User'}
                      </TableCell>
                      <TableCell>{userRole.profiles?.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {userRole.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={userRole.role}
                          onValueChange={(newRole) => updateUserRole(userRole.user_id, newRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="auditor">Auditor</SelectItem>
                            <SelectItem value="analyst">Analyst</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <h2 className="text-2xl font-semibold">Audit Logs</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Track all system actions and user activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.profiles?.email || 'System'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.resource_type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <h2 className="text-2xl font-semibold">System Settings</h2>
          
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Thresholds</CardTitle>
                <CardDescription>Configure global risk scoring thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Low Risk (≥)</Label>
                    <Input type="number" defaultValue="70" />
                  </div>
                  <div>
                    <Label>Medium Risk (≥)</Label>
                    <Input type="number" defaultValue="40" />
                  </div>
                  <div>
                    <Label>High Risk (≥)</Label>
                    <Input type="number" defaultValue="0" />
                  </div>
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure system notifications and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Email notifications for high-risk documents</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Webhook notifications</Label>
                  <Switch />
                </div>
                <div>
                  <Label>Webhook URL</Label>
                  <Input placeholder="https://your-webhook-url.com" />
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;