import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Filter, Eye } from 'lucide-react';

// Mock data for demonstration
const mockAuditLogs = [
  {
    id: '1',
    timestamp: new Date().toISOString(),
    user: 'John Doe',
    email: 'john@example.com',
    action: 'document_uploaded',
    resource: 'compliance document',
    details: 'Privacy Policy v2.1',
    riskLevel: 'low'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    user: 'Jane Smith',
    email: 'jane@example.com',
    action: 'compliance_report_generated',
    resource: 'report',
    details: 'GDPR Compliance Report',
    riskLevel: 'medium'
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    user: 'Mike Johnson',
    email: 'mike@example.com',
    action: 'document_deleted',
    resource: 'document',
    details: 'Old Policy Document',
    riskLevel: 'high'
  }
];

const AuditLog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      'document_uploaded': 'bg-blue-500',
      'document_deleted': 'bg-red-500',
      'document_analyzed': 'bg-green-500',
      'user_login': 'bg-gray-500',
      'user_logout': 'bg-gray-400',
      'compliance_report_generated': 'bg-purple-500',
      'settings_updated': 'bg-orange-500',
    };

    return (
      <Badge 
        variant="secondary" 
        className={`text-white ${actionColors[action] || 'bg-gray-500'}`}
      >
        {action.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel: string) => {
    const riskColors: Record<string, string> = {
      'low': 'bg-green-500',
      'medium': 'bg-yellow-500', 
      'high': 'bg-red-500',
      'critical': 'bg-red-700',
    };

    return (
      <Badge 
        variant="secondary"
        className={`text-white ${riskColors[riskLevel.toLowerCase()] || 'bg-gray-500'}`}
      >
        {riskLevel.toUpperCase()}
      </Badge>
    );
  };

  const exportLogs = () => {
    // Mock export functionality
    console.log('Exporting audit logs...');
  };

  const filteredLogs = mockAuditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'all' || log.riskLevel === riskFilter;
    
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="p-6 space-y-6">
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
                  placeholder="Search actions, resources..."
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
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No audit logs found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.user}</p>
                        <p className="text-xs text-muted-foreground">{log.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.resource}
                    </TableCell>
                    <TableCell>
                      {getRiskBadge(log.riskLevel)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {log.details}
                      </div>
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