import { useEscrow, useReleaseEscrow } from "@/hooks/useEscrow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EscrowStatusProps {
  jobId: number;
  jobStatus: string;
  qualityScore?: string;
  isCustomer: boolean;
}

export function EscrowStatus({ jobId, jobStatus, qualityScore, isCustomer }: EscrowStatusProps) {
  const { data: escrow, isLoading } = useEscrow(jobId);
  const releaseEscrow = useReleaseEscrow();
  const { toast } = useToast();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading escrow status...</div>;
  }

  if (!escrow) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No escrow created yet. Payment pending.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    held: {
      icon: Lock,
      badge: "secondary",
      label: "Held in Escrow",
      description: "Funds are securely held until job completion and quality approval",
    },
    released: {
      icon: CheckCircle,
      badge: "default",
      label: "Released",
      description: "Funds have been released to the printer owner",
    },
    disputed: {
      icon: AlertCircle,
      badge: "destructive",
      label: "Disputed",
      description: "Escrow is on hold due to an open dispute",
    },
  };

  const config = statusConfig[escrow.status as keyof typeof statusConfig];
  const Icon = config?.icon || DollarSign;
  const canRelease =
    isCustomer &&
    escrow.status === 'held' &&
    jobStatus === 'completed' &&
    qualityScore &&
    parseFloat(qualityScore) >= 70;

  const handleRelease = async () => {
    try {
      await releaseEscrow.mutateAsync(escrow.id);
      toast({
        title: "Escrow Released",
        description: "Payment has been successfully released to the printer owner.",
      });
    } catch (error: any) {
      toast({
        title: "Release Failed",
        description: error.message || "Failed to release escrow",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Escrow Status</CardTitle>
          </div>
          <Badge variant={config?.badge as any || "secondary"}>
            {config?.label || escrow.status}
          </Badge>
        </div>
        <CardDescription>{config?.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="text-lg font-semibold">${parseFloat(escrow.amount).toFixed(2)}</span>
        </div>

        {escrow.status === 'held' && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Held since</span>
            <span>{new Date(escrow.heldAt).toLocaleDateString()}</span>
          </div>
        )}

        {escrow.status === 'released' && escrow.releasedAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Released on</span>
            <span>{new Date(escrow.releasedAt).toLocaleDateString()}</span>
          </div>
        )}

        {canRelease && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Quality approved (Score: {qualityScore}/100)</span>
            </div>
            <Button
              onClick={handleRelease}
              className="w-full"
              disabled={releaseEscrow.isPending}
            >
              {releaseEscrow.isPending ? "Releasing..." : "Release Payment"}
            </Button>
          </div>
        )}

        {escrow.status === 'held' && !canRelease && isCustomer && (
          <div className="text-sm text-muted-foreground pt-2">
            {jobStatus !== 'completed' ? (
              <p>Escrow will be available for release once the job is completed.</p>
            ) : !qualityScore ? (
              <p>Awaiting quality verification before release.</p>
            ) : parseFloat(qualityScore) < 70 ? (
              <p className="text-amber-600">Quality score below threshold ({qualityScore}/100). Consider filing a dispute.</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
