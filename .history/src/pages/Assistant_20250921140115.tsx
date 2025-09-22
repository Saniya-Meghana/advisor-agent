// src/pages/Assistant.tsx
import EnhancedComplianceChat from "@/components/chat/EnhancedComplianceChat";

const Assistant = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Compliance Assistant</h1>
        <p className="text-muted-foreground">
          Chat with your AI advisor for AML, KYC, SOX, GDPR, and more.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <EnhancedComplianceChat />
      </div>
    </div>
  );
};

export default Assistant;
