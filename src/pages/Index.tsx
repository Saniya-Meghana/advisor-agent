import Hero from "@/components/branding/Hero";
import EnhancedComplianceChat from "@/components/chat/EnhancedComplianceChat";
import UserMenu from "@/components/auth/UserMenu";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex justify-end mb-4">
          <UserMenu />
        </div>
        
        <Hero />

        {/* Quick Actions */}
        <section className="mt-12">
          <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
            <Link to="/dashboard">
              <Card className="card-elevated hover-scale cursor-pointer">
                <CardHeader className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto text-primary mb-2" />
                  <CardTitle className="text-lg">Dashboard</CardTitle>
                  <CardDescription>View compliance overview</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/documents">
              <Card className="card-elevated hover-scale cursor-pointer">
                <CardHeader className="text-center">
                  <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                  <CardTitle className="text-lg">Add Documents</CardTitle>
                  <CardDescription>Upload compliance documents</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </section>

        <section id="how-it-works" className="mt-12">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <p className="mt-2 text-muted-foreground max-w-prose">
            Ask any compliance question. The advisor retrieves relevant policy and regulation text, then answers with clear, concise guidance and transparent citations.
            If the context is missing, it explains the gap and suggests next steps.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="card-elevated rounded-lg p-5">
              <h3 className="font-semibold">AI-Powered Analysis</h3>
              <p className="mt-1 text-sm text-muted-foreground">Advanced AI analyzes your documents for compliance gaps and risks.</p>
            </article>
            <article className="card-elevated rounded-lg p-5">
              <h3 className="font-semibold">Real-time Guidance</h3>
              <p className="mt-1 text-sm text-muted-foreground">Get instant answers to compliance questions with contextual advice.</p>
            </article>
            <article className="card-elevated rounded-lg p-5">
              <h3 className="font-semibold">Actionable Insights</h3>
              <p className="mt-1 text-sm text-muted-foreground">Receive specific recommendations and action plans for compliance.</p>
            </article>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Compliance Assistant</h2>
          <EnhancedComplianceChat />
        </section>
      </div>
    </main>
  );
};

export default Index;
