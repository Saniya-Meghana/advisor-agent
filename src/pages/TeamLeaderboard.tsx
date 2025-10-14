import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamMember {
  user_id: string;
  email: string;
  full_name: string | null;
  deployments_count: number;
  approvals_count: number;
  rollbacks_count: number;
  checklist_completed_count: number;
  governance_score: number;
  calculated_score?: number;
}

export default function TeamLeaderboard() {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateScore = (member: TeamMember) => {
    return (
      member.deployments_count * 1 +
      member.checklist_completed_count * 2 +
      member.approvals_count * 1 -
      member.rollbacks_count * 2
    );
  };

  const getGovernanceLevel = (score: number) => {
    if (score > 20) return { label: "Excellent", color: "default", icon: Trophy };
    if (score > 10) return { label: "Good", color: "secondary", icon: Medal };
    return { label: "Needs Review", color: "outline", icon: Award };
  };

  const getRankEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get current period (this month)
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Fetch team metrics with profile data
        const { data: metricsData, error: metricsError } = await supabase
          .from("team_metrics")
          .select(`
            *,
            profiles!user_id (
              email,
              full_name
            )
          `)
          .gte("period_start", periodStart.toISOString().split('T')[0])
          .lte("period_end", periodEnd.toISOString().split('T')[0]);

        if (metricsError) throw metricsError;

        // Transform and sort data
        const teamData = (metricsData || []).map((m: any) => ({
          user_id: m.user_id,
          email: m.profiles?.email || "Unknown",
          full_name: m.profiles?.full_name,
          deployments_count: m.deployments_count || 0,
          approvals_count: m.approvals_count || 0,
          rollbacks_count: m.rollbacks_count || 0,
          checklist_completed_count: m.checklist_completed_count || 0,
          governance_score: m.governance_score || 0,
        }));

        // Calculate scores and sort
        const sorted = teamData
          .map((member) => ({
            ...member,
            calculated_score: calculateScore(member),
          }))
          .sort((a, b) => b.calculated_score - a.calculated_score);

        setMembers(sorted);
      } catch (error: any) {
        toast({
          title: "Error fetching leaderboard",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [toast]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Team Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Deployment hygiene & checklist completion champions
        </p>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No team metrics available yet. Start deploying and completing checklists to appear on the leaderboard!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {members.slice(0, 3).map((member, idx) => {
              const level = getGovernanceLevel(member.calculated_score);
              const Icon = level.icon;
              
              return (
                <Card key={member.user_id} className={idx === 0 ? "border-yellow-500 border-2" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {getRankEmoji(idx)} {member.full_name || member.email}
                      </CardTitle>
                      <Icon className={`h-6 w-6 ${idx === 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
                    </div>
                    <CardDescription>
                      <Badge variant={level.color as any}>{level.label} Governance</Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score:</span>
                      <span className="font-bold">{member.calculated_score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deployments:</span>
                      <span>{member.deployments_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Checklists:</span>
                      <span>{member.checklist_completed_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approvals:</span>
                      <span>{member.approvals_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rollbacks:</span>
                      <span className="text-destructive">{member.rollbacks_count}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Full Rankings</CardTitle>
              <CardDescription>Team performance this month</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Deployments</TableHead>
                    <TableHead className="text-right">Checklists</TableHead>
                    <TableHead className="text-right">Approvals</TableHead>
                    <TableHead className="text-right">Rollbacks</TableHead>
                    <TableHead>Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member, idx) => {
                    const level = getGovernanceLevel(member.calculated_score);
                    return (
                      <TableRow key={member.user_id}>
                        <TableCell className="font-medium">{getRankEmoji(idx)}</TableCell>
                        <TableCell>{member.full_name || member.email}</TableCell>
                        <TableCell className="text-right font-bold">{member.calculated_score}</TableCell>
                        <TableCell className="text-right">{member.deployments_count}</TableCell>
                        <TableCell className="text-right">{member.checklist_completed_count}</TableCell>
                        <TableCell className="text-right">{member.approvals_count}</TableCell>
                        <TableCell className="text-right text-destructive">{member.rollbacks_count}</TableCell>
                        <TableCell>
                          <Badge variant={level.color as any}>{level.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {members[0] && (
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Spotlight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  🥇 <strong>{members[0].full_name || members[0].email}</strong> leads with{" "}
                  <strong>{members[0].deployments_count}</strong> deployments and{" "}
                  <strong>{members[0].checklist_completed_count}</strong> checklist completions this month!
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
