import Hero from "@/components/branding/Hero";
import ComplianceChat from "@/components/chat/ComplianceChat";
import Header from "@/components/layout/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <Hero />

          <section id="how-it-works" className="mt-12">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <p className="mt-2 text-muted-foreground max-w-prose">
              Ask any compliance question. The advisor retrieves relevant policy and regulation text, then answers with clear, concise guidance and transparent citations.
              If the context is missing, it explains the gap and suggests next steps.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <article className="card-elevated rounded-lg p-5">
                <h3 className="font-semibold">Accuracy First</h3>
                <p className="mt-1 text-sm text-muted-foreground">Grounded answers based on retrieved documents and sections.</p>
              </article>
              <article className="card-elevated rounded-lg p-5">
                <h3 className="font-semibold">Empathy Always</h3>
                <p className="mt-1 text-sm text-muted-foreground">Friendly tone that supports good intent and learning.</p>
              </article>
              <article className="card-elevated rounded-lg p-5">
                <h3 className="font-semibold">Source Transparency</h3>
                <p className="mt-1 text-sm text-muted-foreground">Citations with documents and sections wherever possible.</p>
              </article>
            </div>
          </section>

          <ComplianceChat />
        </div>
      </main>
    </div>
  );
};

export default Index;
