import { useMyDisputes, useResolveDispute, Dispute } from "@/hooks/useDisputes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DisputeList() {
  const { data: disputes, isLoading } = useMyDisputes();
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading disputes...</div>;
  }

  if (!disputes || disputes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No disputes. All your jobs are running smoothly!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {disputes.map((dispute) => (
          <DisputeCard
            key={dispute.id}
            dispute={dispute}
            onClick={() => setSelectedDispute(dispute)}
          />
        ))}
      </div>

      {selectedDispute && (
        <DisputeDetailsDialog
          dispute={selectedDispute}
          open={!!selectedDispute}
          onClose={() => setSelectedDispute(null)}
        />
      )}
    </>
  );
}

interface DisputeCardProps {
  dispute: Dispute;
  onClick: () => void;
}

function DisputeCard({ dispute, onClick }: DisputeCardProps) {
  const statusConfig = {
    open: {
      icon: AlertTriangle,
      badge: "destructive",
      label: "Open",
    },
    resolved: {
      icon: CheckCircle2,
      badge: "default",
      label: "Resolved",
    },
    escalated: {
      icon: Clock,
      badge: "secondary",
      label: "Escalated",
    },
  };

  const config = statusConfig[dispute.status as keyof typeof statusConfig];
  const Icon = config?.icon || FileText;

  return (
    <Card className="cursor-pointer hover:border-primary transition-colors" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <CardTitle className="text-base">Job #{dispute.jobId} - {dispute.type}</CardTitle>
            </div>
            <CardDescription className="line-clamp-2">
              {dispute.description}
            </CardDescription>
          </div>
          <Badge variant={config?.badge as any}>
            {config?.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Filed {new Date(dispute.createdAt).toLocaleDateString()}</span>
          <Button variant="ghost" size="sm" onClick={onClick}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface DisputeDetailsDialogProps {
  dispute: Dispute;
  open: boolean;
  onClose: () => void;
}

function DisputeDetailsDialog({ dispute, open, onClose }: DisputeDetailsDialogProps) {
  const [resolution, setResolution] = useState('');
  const [releaseEscrow, setReleaseEscrow] = useState(false);
  const { toast } = useToast();
  const resolveDispute = useResolveDispute();

  const handleResolve = async () => {
    if (!resolution.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a resolution summary.",
        variant: "destructive",
      });
      return;
    }

    try {
      await resolveDispute.mutateAsync({
        disputeId: dispute.id,
        resolution: resolution.trim(),
        releaseEscrow,
      });

      toast({
        title: "Dispute Resolved",
        description: "The dispute has been successfully resolved.",
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Resolution Failed",
        description: error.message || "Failed to resolve dispute.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Dispute Details</DialogTitle>
          <DialogDescription>
            Job #{dispute.jobId} - {dispute.type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium">Type</Label>
            <p className="text-sm capitalize mt-1">{dispute.type.replace('_', ' ')}</p>
          </div>

          <div>
            <Label className="text-sm font-medium">Description</Label>
            <p className="text-sm mt-1 whitespace-pre-wrap">{dispute.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <p className="text-sm mt-1 capitalize">{dispute.status}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Filed On</Label>
              <p className="text-sm mt-1">
                {new Date(dispute.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Evidence</Label>
              <div className="mt-2 space-y-1">
                {dispute.evidenceUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block"
                  >
                    Evidence {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {dispute.status === 'resolved' && dispute.resolution && (
            <div>
              <Label className="text-sm font-medium">Resolution</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap bg-muted p-3 rounded-md">
                {dispute.resolution}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Resolved on {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          )}

          {dispute.status === 'open' && (
            <div className="space-y-3 pt-4 border-t">
              <Label htmlFor="resolution-text">Resolve Dispute</Label>
              <Textarea
                id="resolution-text"
                placeholder="Describe how this dispute was resolved..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="release-escrow"
                  checked={releaseEscrow}
                  onCheckedChange={(checked) => setReleaseEscrow(checked === true)}
                />
                <label
                  htmlFor="release-escrow"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Release escrow payment to printer owner
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {dispute.status === 'open' && (
            <Button
              onClick={handleResolve}
              disabled={!resolution.trim() || resolveDispute.isPending}
            >
              {resolveDispute.isPending ? "Resolving..." : "Resolve Dispute"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
