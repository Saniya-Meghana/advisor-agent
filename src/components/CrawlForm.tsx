import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';

interface CrawlResult {
  success: boolean;
  status?: string;
  completed?: number;
  total?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: any[];
  error?: string;
}

export const CrawlForm = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setProgress(0);
    setCrawlResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('crawl-website', {
        body: { url }
      });

      if (error) {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to crawl website", 
          variant: "destructive", 
          duration: 3000 
        });
        setCrawlResult({ success: false, error: error.message });
        return;
      }

      if (data.success) {
        toast({ 
          title: "Crawl completed", 
          description: "Website crawled successfully.", 
          duration: 2500 
        });
        setCrawlResult({ success: true, ...data.data });
      } else {
        toast({ 
          title: "Error", 
          description: data.error || "Failed to crawl website", 
          variant: "destructive", 
          duration: 3000 
        });
        setCrawlResult({ success: false, error: data.error });
      }
    } catch (error) {
      console.error('Error crawling website:', error);
      toast({ 
        title: "Error", 
        description: "Failed to crawl website", 
        variant: "destructive", 
        duration: 3000 
      });
      setCrawlResult({ success: false, error: "Network error" });
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="url" className="text-sm font-medium">Website URL</label>
          <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" required />
        </div>
        {isLoading && (<Progress value={progress} className="w-full" />)}
        <Button type="submit" disabled={isLoading} className="w-full" variant="hero">
          {isLoading ? "Crawling..." : "Start Crawl"}
        </Button>
      </form>

      {crawlResult && (
        <Card className="mt-6 p-4">
          <h3 className="text-lg font-semibold mb-2">Crawl Results</h3>
          <div className="space-y-2 text-sm">
            <p>Status: {crawlResult.status}</p>
            <p>Completed Pages: {crawlResult.completed}</p>
            <p>Total Pages: {crawlResult.total}</p>
            <p>Credits Used: {crawlResult.creditsUsed}</p>
            <p>Expires At: {crawlResult.expiresAt ? new Date(crawlResult.expiresAt).toLocaleString() : "—"}</p>
            {crawlResult.data && (
              <div className="mt-4">
                <p className="font-semibold mb-2">Crawled Data:</p>
                <pre className="bg-muted p-2 rounded overflow-auto max-h-60">
                  {JSON.stringify(crawlResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
