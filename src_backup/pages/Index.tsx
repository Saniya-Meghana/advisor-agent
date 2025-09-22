import EnhancedComplianceChat from "@/components/chat/EnhancedComplianceChat";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="p-6 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight font-display">
          Risk & Compliance Advisor AI
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          A warm, trustworthy assistant to help you navigate AML, KYC, SOX, and GDPR—
          with clear, source-cited guidance. If something isn't certain, it will say so.
        </p>
        <p className="text-sm text-muted-foreground">
          Friendly tone. Accurate answers. Transparent sources.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="max-w-2xl mx-auto">
        <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      <section id="how-it-works" className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <p className="mt-2 text-muted-foreground max-w-prose mx-auto">
            Ask any compliance question. The advisor retrieves relevant policy and regulation text, then answers with clear, concise guidance and transparent citations.
            If the context is missing, it explains the gap and suggests next steps.
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
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

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Compliance Assistant</h2>
          <p className="text-muted-foreground">Start a conversation with your AI compliance advisor</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <EnhancedComplianceChat />
        </div>
      </section>
    </div>
  );
};

export default Index;
