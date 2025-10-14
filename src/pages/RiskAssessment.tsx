import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, TrendingDown, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
}

interface RiskResult {
  score: number;
  level: string;
  factors: RiskFactor[];
  mitigationSteps: string[];
}

export default function RiskAssessment() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configData, setConfigData] = useState({
    accuracy: "",
    latency: "",
    errorRate: "",
    environment: "production",
  });
  const [riskResult, setRiskResult] = useState<RiskResult | null>(null);

  const calculateRisk = () => {
    const accuracy = parseFloat(configData.accuracy) || 0;
    const latency = parseInt(configData.latency) || 0;
    const errorRate = parseFloat(configData.errorRate) || 0;

    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Accuracy factor
    if (accuracy < 0.85) {
      const impact = Math.round((0.85 - accuracy) * 100);
      factors.push({
        factor: "Low Accuracy",
        impact,
        description: `Accuracy of ${accuracy.toFixed(3)} is below threshold of 0.850`,
      });
      totalScore += impact;
    }

    // Latency factor
    if (latency > 500) {
      const impact = Math.min(Math.round((latency - 500) / 10), 30);
      factors.push({
        factor: "High Latency",
        impact,
        description: `Latency of ${latency}ms exceeds 500ms threshold`,
      });
      totalScore += impact;
    }

    // Error rate factor
    if (errorRate > 0.02) {
      const impact = Math.round(errorRate * 1000);
      factors.push({
        factor: "High Error Rate",
        impact,
        description: `Error rate of ${(errorRate * 100).toFixed(2)}% exceeds 2% threshold`,
      });
      totalScore += impact;
    }

    // Environment multiplier
    if (configData.environment === "production") {
      totalScore = Math.round(totalScore * 1.5);
    }

    // Cap score at 100
    const finalScore = Math.min(totalScore, 100);

    // Determine risk level
    let level: string;
    if (finalScore >= 75) level = "critical";
    else if (finalScore >= 50) level = "high";
    else if (finalScore >= 25) level = "medium";
    else level = "low";

    // Generate mitigation steps
    const mitigationSteps: string[] = [];
    if (accuracy < 0.85) {
      mitigationSteps.push("Review model training data and retrain with additional samples");
      mitigationSteps.push("Consider ensemble methods to improve accuracy");
    }
    if (latency > 500) {
      mitigationSteps.push("Optimize model inference pipeline");
      mitigationSteps.push("Consider caching strategies for frequently-accessed data");
    }
    if (errorRate > 0.02) {
      mitigationSteps.push("Implement robust error handling and fallback mechanisms");
      mitigationSteps.push("Add comprehensive input validation");
    }
    if (configData.environment === "production") {
      mitigationSteps.push("Deploy to staging first for validation");
      mitigationSteps.push("Set up monitoring alerts for critical metrics");
    }

    return {
      score: finalScore,
      level,
      factors,
      mitigationSteps,
    };
  };

  const handleAssess = async () => {
    if (!configData.accuracy || !configData.latency || !configData.errorRate) {
      toast({
        title: "Missing data",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = calculateRisk();
      setRiskResult(result);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: insertError } = await supabase.from("risk_assessments").insert({
          user_id: user.id,
          config_fingerprint: JSON.stringify(configData),
          risk_score: result.score,
          risk_level: result.level,
          risk_factors: result.factors as any,
          mitigation_steps: result.mitigationSteps as any,
        });
        
        if (insertError) {
          console.error("Error saving risk assessment:", insertError);
        }
      }

      toast({
        title: "Risk assessment complete",
        description: `Risk level: ${result.level.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: "Assessment failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "warning";
      default: return "default";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "critical":
      case "high":
        return AlertTriangle;
      case "medium":
        return TrendingDown;
      default:
        return Shield;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Deployment Risk Assessment
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate risk score before deployment
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration Input</CardTitle>
            <CardDescription>Enter your deployment metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accuracy">Model Accuracy</Label>
              <Input
                id="accuracy"
                type="number"
                step="0.001"
                placeholder="0.891"
                value={configData.accuracy}
                onChange={(e) => setConfigData({ ...configData, accuracy: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="latency">Latency (ms)</Label>
              <Input
                id="latency"
                type="number"
                placeholder="250"
                value={configData.latency}
                onChange={(e) => setConfigData({ ...configData, latency: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="errorRate">Error Rate</Label>
              <Input
                id="errorRate"
                type="number"
                step="0.001"
                placeholder="0.015"
                value={configData.errorRate}
                onChange={(e) => setConfigData({ ...configData, errorRate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Target Environment</Label>
              <select
                id="environment"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={configData.environment}
                onChange={(e) => setConfigData({ ...configData, environment: e.target.value })}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>

            <Button onClick={handleAssess} disabled={loading} className="w-full">
              {loading ? "Assessing..." : "Calculate Risk Score"}
            </Button>
          </CardContent>
        </Card>

        {riskResult && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Risk Analysis</CardTitle>
                <Badge variant={getRiskColor(riskResult.level) as any} className="text-lg">
                  {riskResult.level.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Risk Score</span>
                  <span className="text-2xl font-bold">{riskResult.score}/100</span>
                </div>
                <Progress value={riskResult.score} className="h-3" />
              </div>

              {riskResult.factors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Risk Factors
                  </h3>
                  <div className="space-y-2">
                    {riskResult.factors.map((factor, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{factor.factor}</span>
                          <Badge variant="outline">+{factor.impact} pts</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {riskResult.mitigationSteps.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Recommended Actions
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {riskResult.mitigationSteps.map((step, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
