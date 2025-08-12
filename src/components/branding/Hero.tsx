import heroImage from "@/assets/hero-compliance.jpg";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <header className="w-full">
      <section className="relative overflow-hidden rounded-xl border card-elevated">
        <div className="absolute inset-0 gradient-hero opacity-80" aria-hidden="true" />

        <div className="relative grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight font-display animate-enter">
              Risk & Compliance Advisor AI
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-prose animate-fade-in">
              A warm, trustworthy assistant to help you navigate AML, KYC, SOX, and GDPR—
              with clear, source-cited guidance. If something isn’t certain, it will say so.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#chat" className="hover-scale">
                <Button variant="hero" size="lg" aria-label="Start chatting with the advisor">
                  Start chatting
                </Button>
              </a>
              <a href="#how-it-works" className="focus-visible:ring-2 focus-visible:ring-ring rounded-md hover-scale">
                <Button variant="outline" size="lg" aria-label="Learn how it works">
                  How it works
                </Button>
              </a>
              <a href="/documents" className="focus-visible:ring-2 focus-visible:ring-ring rounded-md hover-scale">
                <Button variant="outline" size="lg" aria-label="Add documents for retrieval">
                  Add documents
                </Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Friendly tone. Accurate answers. Transparent sources.
            </p>
          </div>

          <div className="relative animate-enter">
            <img
              src={heroImage}
              alt="Abstract compliance hero illustration with shield, documents, and a world map grid"
              loading="lazy"
              decoding="async"
              className="w-full h-64 md:h-full object-cover rounded-lg border shadow"
            />
          </div>
        </div>
      </section>
    </header>
  );
};

export default Hero;
