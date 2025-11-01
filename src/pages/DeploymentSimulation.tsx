import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, CheckCircle, PlayCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimulationParams {
  modelAccuracy: number;
  expectedLatency: number;
  errorRate: number;
  trafficVolume: number;
  environment: "development" | "staging" | "production";
  hasRollbackPlan: boolean;
  hasMonitoring: boolean;
}

interface SimulationResult {
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  predictions: {
    expectedFailures: number;
    estimatedDowntime: number;
    affectedUsers: number;
    rollbackTime: number;
  };
  recommendations: string[];
  shouldProceed: boolean;
}

export default function DeploymentSimulation() {
  const { toast } = useToast();
  const [params, setParams] = useState<SimulationParams>({
    modelAccuracy: 95,
    expectedLatency: 200,
    errorRate: 0.5,
    trafficVolume: 1000,
    environment: "staging",
    hasRollbackPlan: false,
    hasMonitoring: false,
  });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async () => {
    setIsSimulating(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Calculate risk score
    let riskScore = 0;
    
    // Accuracy impact (0-30 points)
    riskScore += (100 - params.modelAccuracy) * 0.3;
    
    // Latency impact (0-20 points)
    riskScore += Math.min((params.expectedLatency / 10), 20);
    
    // Error rate impact (0-25 points)
    riskScore += params.errorRate * 5;
    
    // Environment impact
    const envRisk = { development: 0, staging: 10, production: 25 };
    riskScore += envRisk[params.environment];
    
    // Safety measures (reduce risk)
    if (params.hasRollbackPlan) riskScore -= 15;
    if (params.hasMonitoring) riskScore -= 10;
    
    // Traffic volume impact
    const trafficRisk = (params.trafficVolume / 100) * 0.5;
    riskScore += trafficRisk;

    riskScore = Math.max(0, Math.min(100, riskScore));

    // Determine risk level
    let riskLevel: "Low" | "Medium" | "High" | "Critical";
    if (riskScore < 25) riskLevel = "Low";
    else if (riskScore < 50) riskLevel = "Medium";
    else if (riskScore < 75) riskLevel = "High";
    else riskLevel = "Critical";

    // Calculate predictions
    const baseFailureRate = params.errorRate / 100;
    const expectedFailures = Math.round(params.trafficVolume * baseFailureRate * (riskScore / 100));
    const estimatedDowntime = Math.round(params.expectedLatency * expectedFailures * 0.001);
    const affectedUsers = Math.round(params.trafficVolume * (riskScore / 200));
    const rollbackTime = params.hasRollbackPlan ? 5 : 30;

    // Generate recommendations
    const recommendations: string[] = [];
    if (params.modelAccuracy < 95) {
      recommendations.push("Improve model accuracy before deployment");
    }
    if (params.expectedLatency > 500) {
      recommendations.push("Optimize latency - target under 500ms");
    }
    if (params.errorRate > 1) {
      recommendations.push("Reduce error rate to under 1%");
    }
    if (!params.hasRollbackPlan) {
      recommendations.push("Implement automated rollback mechanism");
    }
    if (!params.hasMonitoring) {
      recommendations.push("Set up comprehensive monitoring and alerts");
    }
    if (params.environment === "production" && riskScore > 50) {
      recommendations.push("Deploy to staging first to validate changes");
    }
    if (recommendations.length === 0) {
      recommendations.push("All metrics look good - safe to proceed");
    }

    const simulationResult: SimulationResult = {
      riskScore: Math.round(riskScore),
      riskLevel,
      predictions: {
        expectedFailures,
        estimatedDowntime,
        affectedUsers,
        rollbackTime,
      },
      recommendations,
      shouldProceed: riskScore < 50,
    };

    setResult(simulationResult);
    setIsSimulating(false);

    toast({
      title: "Simulation Complete",
      description: `Risk Level: ${riskLevel} (${Math.round(riskScore)}/100)`,
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Low": return "text-green-600 bg-green-100";
      case "Medium": return "text-yellow-600 bg-yellow-100";
      case "High": return "text-orange-600 bg-orange-100";
      case "Critical": return "text-red-600 bg-red-100";
      default: return "";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployment Simulation Sandbox</h1>
          <p className="text-muted-foreground mt-2">
            Simulate deployments and predict potential risks before going live
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Simulation Parameters</CardTitle>
            <CardDescription>Configure your deployment scenario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Model Accuracy (%): {params.modelAccuracy}</Label>
              <Slider
                value={[params.modelAccuracy]}
                onValueChange={([value]) => setParams({ ...params, modelAccuracy: value })}
                min={50}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Latency (ms)</Label>
              <Input
                type="number"
                value={params.expectedLatency}
                onChange={(e) => setParams({ ...params, expectedLatency: Number(e.target.value) })}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Error Rate (%): {params.errorRate}</Label>
              <Slider
                value={[params.errorRate]}
                onValueChange={([value]) => setParams({ ...params, errorRate: value })}
                min={0}
                max={10}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label>Traffic Volume (req/min)</Label>
              <Input
                type="number"
                value={params.trafficVolume}
                onChange={(e) => setParams({ ...params, trafficVolume: Number(e.target.value) })}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={params.environment}
                onValueChange={(value: any) => setParams({ ...params, environment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rollback"
                  checked={params.hasRollbackPlan}
                  onChange={(e) => setParams({ ...params, hasRollbackPlan: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="rollback" className="cursor-pointer">Has Rollback Plan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="monitoring"
                  checked={params.hasMonitoring}
                  onChange={(e) => setParams({ ...params, hasMonitoring: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="monitoring" className="cursor-pointer">Has Monitoring Setup</Label>
              </div>
            </div>

            <Button
              onClick={runSimulation}
              disabled={isSimulating}
              className="w-full"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {isSimulating ? "Running Simulation..." : "Run Simulation"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
            <CardDescription>
              {result ? "Predicted deployment outcome" : "Configure parameters and run simulation"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                    <p className="text-3xl font-bold">{result.riskScore}/100</p>
                  </div>
                  <Badge className={getRiskColor(result.riskLevel)}>
                    {result.riskLevel} Risk
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Predictions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Expected Failures</p>
                      <p className="text-lg font-semibold">{result.predictions.expectedFailures}</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Downtime (min)</p>
                      <p className="text-lg font-semibold">{result.predictions.estimatedDowntime}</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Affected Users</p>
                      <p className="text-lg font-semibold">{result.predictions.affectedUsers}</p>
                    </div>
                    <div className="p-3 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Rollback Time (min)</p>
                      <p className="text-lg font-semibold">{result.predictions.rollbackTime}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Recommendations</h3>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-muted rounded">
                        {result.shouldProceed && result.recommendations.length === 1 ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        )}
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                  result.shouldProceed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {result.shouldProceed ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <p className="font-semibold">Safe to proceed with deployment</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5" />
                      <p className="font-semibold">Address issues before deploying</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Run a simulation to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
