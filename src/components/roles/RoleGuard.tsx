import { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'auditor' | 'analyst' | 'viewer')[];
  fallback?: ReactNode;
}

const RoleGuard = ({ children, allowedRoles, fallback }: RoleGuardProps) => {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserRoles();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserRoles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const roles = data?.map(item => item.role) || [];
      setUserRoles(roles);
      
      // If user has no roles, assign default 'viewer' role
      if (roles.length === 0) {
        await assignDefaultRole();
      }
    } catch (error: unknown) {
      console.error('Error fetching user roles:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const assignDefaultRole = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'viewer' });

      if (error) throw error;
      setUserRoles(['viewer']);
    } catch (error: unknown) {
      console.error('Error assigning default role:', error);
      setError('Failed to assign default role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Permission Error</AlertTitle>
        <AlertDescription>
          Failed to verify your permissions: {error}
        </AlertDescription>
      </Alert>
    );
  }

  const hasPermission = userRoles.some(role => allowedRoles.includes(role as any));

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Access Restricted</AlertTitle>
        <AlertDescription>
          You need one of the following roles to access this content: {allowedRoles.join(', ')}.
          <br />
          Your current roles: {userRoles.join(', ') || 'None'}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;