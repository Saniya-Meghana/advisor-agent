import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  BarChart3, 
  ScrollText, 
  Settings, 
  CheckCircle, 
  ArrowRight,
  ArrowLeft,
  Upload,
  Shield,
  Brain
} from 'lucide-react';

const onboardingSteps = [
  {
    id: 1,
    title: "Upload Your Documents",
    description: "Start by uploading your compliance documents like policies, procedures, and regulatory filings. We support PDF, DOCX, DOC, CSV, XLS, and XLSX formats.",
    icon: FileText,
    features: [
      "Drag & drop interface",
      "Multiple file upload",
      "Automatic file validation",
      "Secure cloud storage"
    ],
    action: "Go to Documents",
    route: "/documents"
  },
  {
    id: 2,
    title: "AI-Powered Analysis",
    description: "Our advanced AI automatically analyzes your documents for compliance gaps, regulatory risks, and provides detailed scoring across AML, KYC, SOX, and GDPR frameworks.",
    icon: Brain,
    features: [
      "Automated compliance scanning",
      "Risk level assessment",
      "Regulatory framework mapping",
      "Detailed scoring reports"
    ],
    action: "View Dashboard",
    route: "/"
  },
  {
    id: 3,
    title: "Track & Monitor",
    description: "Monitor your compliance status with real-time dashboards and comprehensive audit logs. Track all system activities and document changes.",
    icon: BarChart3,
    features: [
      "Real-time compliance scores",
      "Risk visualization charts",
      "Activity monitoring",
      "Trend analysis"
    ],
    action: "View Dashboard",
    route: "/"
  },
  {
    id: 4,
    title: "Audit & Export",
    description: "Access comprehensive audit trails and export compliance reports. Keep detailed records for regulatory inspections and internal audits.",
    icon: ScrollText,
    features: [
      "Complete audit trails",
      "CSV/PDF export options",
      "Filter and search logs",
      "Compliance reporting"
    ],
    action: "View Audit Log",
    route: "/audit"
  }
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepAction = (route: string) => {
    setCompletedSteps(prev => new Set(prev).add(onboardingSteps[currentStep].id));
    navigate(route);
  };

  const handleCompleteOnboarding = () => {
    toast({
      title: "Welcome aboard!",
      description: "You're all set to start managing compliance with AI assistance.",
    });
    navigate('/');
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center mr-4">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Risk & Compliance Advisor</h1>
              <p className="text-muted-foreground">Get started in just a few steps</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {onboardingSteps.length}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {onboardingSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  transition-colors duration-200
                  ${index === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : completedSteps.has(step.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                  }
                `}
              >
                {completedSteps.has(step.id) ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Step Content */}
        <Card className="card-elevated">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <currentStepData.icon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl mb-2">{currentStepData.title}</CardTitle>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {currentStepData.description}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentStepData.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button 
                onClick={() => handleStepAction(currentStepData.route)}
                size="lg"
                className="flex-1 max-w-xs"
              >
                {currentStepData.action}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              {currentStep === onboardingSteps.length - 1 && (
                <Button 
                  onClick={handleCompleteOnboarding}
                  variant="outline"
                  size="lg"
                  className="flex-1 max-w-xs"
                >
                  Complete Setup
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </Button>
            
            {currentStep < onboardingSteps.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCompleteOnboarding}>
                Get Started
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Need help? Check out our{' '}
            <button 
              className="text-primary hover:underline"
              onClick={() => navigate('/settings')}
            >
              documentation
            </button>{' '}
            or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;