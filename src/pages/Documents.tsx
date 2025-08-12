import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CrawlForm } from "@/components/CrawlForm";
import { FirecrawlService } from "@/utils/FirecrawlService";

const Documents = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState(FirecrawlService.getApiKey() || "");
  const [testing, setTesting] = useState(false);

  const saveKey = () => {
    if (!apiKey) {
      toast({ title: "API key required", description: "Enter your Firecrawl API key.", variant: "destructive" });
      return;
    }
    FirecrawlService.saveApiKey(apiKey);
    toast({ title: "Saved", description: "API key stored locally for this browser." });
  };

  const testKey = async () => {
    try {
      setTesting(true);
      const ok = await FirecrawlService.testApiKey(apiKey);
      toast({ title: ok ? "API key works" : "API key failed", description: ok ? "Ready to crawl." : "Please verify your key." , variant: ok ? undefined : "destructive"});
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <header>
          <h1 className="text-3xl font-display font-bold">Documents</h1>
          <p className="mt-2 text-muted-foreground max-w-prose">
            To securely store and retrieve documents for RAG, please connect Supabase in the top-right first. For quick tests, you can use Firecrawl below with a temporary API key stored in your browser.
          </p>
        </header>

        <section className="mt-8 grid gap-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Supabase Integration (Recommended)</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Connect your project to Supabase to enable secure document storage, authentication, and server-side API key management.
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Firecrawl API Key</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Enter Firecrawl API key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={saveKey} variant="outline">Save</Button>
                  <Button onClick={testKey} variant="hero" disabled={testing}>
                    {testing ? 'Testing…' : 'Test key'}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Stored locally; switch to Supabase secrets once connected.</p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Crawl a website</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <CrawlForm />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
};

export default Documents;
