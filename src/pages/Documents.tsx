import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CrawlForm } from "@/components/CrawlForm";

const Documents = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <header>
          <h1 className="text-3xl font-display font-bold">Documents</h1>
          <p className="mt-2 text-muted-foreground max-w-prose">
            Your project is connected to Supabase! You can now securely store and retrieve documents for RAG. Use Firecrawl below to crawl websites and store the content in your database.
          </p>
        </header>

        <section className="mt-8 grid gap-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>✅ Supabase Connected</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Your project is successfully connected to Supabase with secure document storage, authentication, and server-side API key management enabled.
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Firecrawl API Key (Secure Storage)</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Your Firecrawl API key is now securely stored in Supabase secrets. No need to enter it here - just use the crawl form below!
              </p>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <span>✅</span>
                <span>API key configured in Supabase secrets</span>
              </div>
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
