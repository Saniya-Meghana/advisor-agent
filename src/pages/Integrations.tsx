import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface Integration {
  id?: string;
  integration_type: 'slack' | 'teams';
  webhook_url: string;
  is_enabled: boolean;
  notification_rules: {
    on_critical: boolean;
    on_high: boolean;
    on_medium: boolean;
    on_low: boolean;
    min_score: number;
  };
}

const Integrations = () => {
  const [slack, setSlack] = useState<Integration>({
    integration_type: 'slack',
    webhook_url: '',
    is_enabled: false,
    notification_rules: {
      on_critical: true,
      on_high: true,
      on_medium: false,
      on_low: false,
      min_score: 50,
    }
  });

  const [teams, setTeams] = useState<Integration>({
    integration_type: 'teams',
    webhook_url: '',
    is_enabled: false,
    notification_rules: {
      on_critical: true,
      on_high: true,
      on_medium: false,
      on_low: false,
      min_score: 50,
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      data?.forEach(integration => {
        const typedIntegration = {
          ...integration,
          integration_type: integration.integration_type as 'slack' | 'teams',
          notification_rules: integration.notification_rules as Integration['notification_rules']
        };
        
        if (integration.integration_type === 'slack') {
          setSlack(typedIntegration);
        } else if (integration.integration_type === 'teams') {
          setTeams(typedIntegration);
        }
      });
    } catch (error) {
      console.error('Failed to load integrations:', error);
      toast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveIntegration = async (integration: Integration) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const integrationData = {
        user_id: user.id,
        integration_type: integration.integration_type,
        webhook_url: integration.webhook_url,
        is_enabled: integration.is_enabled,
        notification_rules: integration.notification_rules,
      };

      if (integration.id) {
        // Update existing
        const { error } = await supabase
          .from('integration_settings')
          .update(integrationData)
          .eq('id', integration.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('integration_settings')
          .insert(integrationData)
          .select()
          .single();

        if (error) throw error;
        
        // Update state with new ID
        if (integration.integration_type === 'slack') {
          setSlack({ ...integration, id: data.id });
        } else {
          setTeams({ ...integration, id: data.id });
        }
      }

      toast({
        title: "Success",
        description: `${integration.integration_type === 'slack' ? 'Slack' : 'Teams'} integration saved successfully`,
      });
    } catch (error) {
      console.error('Failed to save integration:', error);
      toast({
        title: "Error",
        description: "Failed to save integration",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your workspace tools to receive real-time compliance alerts</p>
      </div>

      {/* Slack Integration */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slack Integration</CardTitle>
              <CardDescription>Send compliance alerts to your Slack workspace</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {slack.webhook_url && (slack.is_enabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slack-webhook">Webhook URL</Label>
            <Input
              id="slack-webhook"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={slack.webhook_url}
              onChange={(e) => setSlack({ ...slack, webhook_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Get your webhook URL from Slack's Incoming Webhooks app
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="slack-enabled">Enable Notifications</Label>
            <Switch
              id="slack-enabled"
              checked={slack.is_enabled}
              onCheckedChange={(checked) => setSlack({ ...slack, is_enabled: checked })}
            />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label>Notification Rules</Label>
            <div className="space-y-2">
              {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{level} Risk Alerts</span>
                  <Switch
                    checked={slack.notification_rules[`on_${level}` as keyof typeof slack.notification_rules] as boolean}
                    onCheckedChange={(checked) => setSlack({
                      ...slack,
                      notification_rules: { ...slack.notification_rules, [`on_${level}`]: checked }
                    })}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => saveIntegration(slack)} 
            disabled={isSaving || !slack.webhook_url}
            className="w-full"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Slack Integration
          </Button>
        </CardContent>
      </Card>

      {/* Teams Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Microsoft Teams Integration</CardTitle>
              <CardDescription>Send compliance alerts to your Teams channels</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {teams.webhook_url && (teams.is_enabled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teams-webhook">Webhook URL</Label>
            <Input
              id="teams-webhook"
              type="url"
              placeholder="https://outlook.office.com/webhook/..."
              value={teams.webhook_url}
              onChange={(e) => setTeams({ ...teams, webhook_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Get your webhook URL from Teams Incoming Webhook connector
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="teams-enabled">Enable Notifications</Label>
            <Switch
              id="teams-enabled"
              checked={teams.is_enabled}
              onCheckedChange={(checked) => setTeams({ ...teams, is_enabled: checked })}
            />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <Label>Notification Rules</Label>
            <div className="space-y-2">
              {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{level} Risk Alerts</span>
                  <Switch
                    checked={teams.notification_rules[`on_${level}` as keyof typeof teams.notification_rules] as boolean}
                    onCheckedChange={(checked) => setTeams({
                      ...teams,
                      notification_rules: { ...teams.notification_rules, [`on_${level}`]: checked }
                    })}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={() => saveIntegration(teams)} 
            disabled={isSaving || !teams.webhook_url}
            className="w-full"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Teams Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
