import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { Bell, Mail, MessageSquare, Save } from "lucide-react";

export function NotificationPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    email_alerts: true,
    sms_alerts: false,
    phone_number: "",
  });

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        return;
      }

      if (data) {
        setSettings({
          email_alerts: data.email_alerts ?? true,
          sms_alerts: data.sms_alerts ?? false,
          phone_number: data.phone_number || "",
        });
      }
    };

    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Notification Preferences</CardTitle>
        </div>
        <CardDescription>
          Manage how you receive notifications about risk alerts and document analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="email-alerts">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for risk summaries and analysis completion
                </p>
              </div>
            </div>
            <Switch
              id="email-alerts"
              checked={settings.email_alerts}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, email_alerts: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="sms-alerts">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get text messages for critical risk alerts (requires phone number)
                </p>
              </div>
            </div>
            <Switch
              id="sms-alerts"
              checked={settings.sms_alerts}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, sms_alerts: checked })
              }
            />
          </div>

          {settings.sms_alerts && (
            <div className="ml-7 space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={settings.phone_number}
                onChange={(e) =>
                  setSettings({ ...settings, phone_number: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +1 for US)
              </p>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}