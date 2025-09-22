import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Calendar } from 'lucide-react';

interface ReportExportProps {
  reportIds: string[];
  onExportComplete?: () => void;
}

const ReportExport: React.FC<ReportExportProps> = ({ reportIds, onExportComplete }) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv' | 'json' | 'xlsx'>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);

  const handleExport = async () => {
    if (reportIds.length === 0) {
      toast({
        title: "No reports selected",
        description: "Please select at least one report to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const { data, error } = await supabase.functions.invoke('export-report', {
        body: {
          report_ids: reportIds,
          format: selectedFormat,
          include_charts: includeCharts
        }
      });

      if (error) throw error;

      // Create download link
      const link = document.createElement('a');
      link.href = data.download_url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `${data.report_count} reports exported as ${data.format.toUpperCase()}`,
      });

      onExportComplete?.();

    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message || 'Failed to export reports',
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Badge variant="outline" className="mb-2">
            {reportIds.length} report{reportIds.length !== 1 ? 's' : ''} selected
          </Badge>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Export Format</label>
          <Select value={selectedFormat} onValueChange={(value: any) => setSelectedFormat(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF Report</SelectItem>
              <SelectItem value="csv">CSV Data</SelectItem>
              <SelectItem value="xlsx">Excel Spreadsheet</SelectItem>
              <SelectItem value="json">JSON Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="charts" 
            checked={includeCharts}
            onCheckedChange={(checked) => setIncludeCharts(checked === true)}
          />
          <label htmlFor="charts" className="text-sm">Include charts and visualizations</label>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={isExporting || reportIds.length === 0}
          className="w-full"
        >
          {isExporting ? 'Exporting...' : `Export ${selectedFormat.toUpperCase()}`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReportExport;