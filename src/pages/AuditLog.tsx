import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Filter, Eye } from "lucide-react";

const AuditLog = () => {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  // Fetch logs initially
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error fetching logs:", error);
      } else {
        console.log("Fetched logs:", data);
        setLogs(data || []);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("audit-logs-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_logs" },
        (payload) => {
          console.log("Realtime event:", payload);

          if (payload.eventType === "INSERT") {
            setLogs((prev) => [payload.new as any, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setLogs((prev) =>
              prev.map((log: any) => (log.id === (payload.new as any).id ? payload.new as any : log))
            );
          } else if (payload.eventType === "DELETE") {
            setLogs((prev) => prev.filter((log: any) => log.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      document_uploaded: "bg-blue-500",
      document_deleted: "bg-red-500",
      document_analyzed: "bg-green-500",
      user_login: "bg-gray-500",
      user_logout: "bg-gray-400",
      compliance_report_generated: "bg-purple-500",
      settings_updated: "bg-orange-500",
    };

    return (
      <Badge variant="secondary" className={`text-white ${actionColors[action] || "bg-gray-500"}`}>
        {action?.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel: string | undefined) => {
    if (!riskLevel) return <Badge variant="secondary">N/A</Badge>;

    const riskColors: Record<string, string> = {
      low: "bg-green-500",
      medium: "bg-yellow-500",
      high: "bg-red-500",
      critical: "bg-red-700",
    };

    return (
      <Badge variant="secondary" className={`text-white ${riskColors[riskLevel.toLowerCase()] || "bg-gray-500"}`}>
        {riskLevel.toUpperCase()}
      </Badge>
    );
  };

  const exportLogs = () => {
    console.log("Exporting audit logs...");
    // later implement CSV export
  };

  const filteredLogs = logs.filter((log: any) => {
    const description = log.details?.description || "";
    const riskLevel = log.details?.risk_level || "";

    const matchesSearch =
      searchTerm === "" ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = riskFilter === "all" || riskLevel === riskFilter;

    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading audit logs...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Audit Log</h1>
            <p className="text-muted-foreground">
              Track system events, compliance analysis, and user actions
            </p>
          </div>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Risk Level Filter */}
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">No audit logs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "N/A"}
                    </TableCell>
                    <TableCell>{log.user_id || "N/A"}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>{log.resource_type || "N/A"}</TableCell>
                    <TableCell>{getRiskBadge(log.details?.risk_level)}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {log.details?.description || JSON.stringify(log.details)}
                      </div>
                    </TableCell>
                    <TableCell>{log.ip_address || "N/A"}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{log.user_agent || "N/A"}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
