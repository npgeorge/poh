import { useJobMatches, MatchScore } from "@/hooks/useMatching";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star, MapPin, Package, DollarSign, Briefcase } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface PrinterMatchesProps {
  jobId: number;
  currentPrinterId?: number;
  onSelectPrinter?: (printerId: number) => void;
}

export function PrinterMatches({ jobId, currentPrinterId, onSelectPrinter }: PrinterMatchesProps) {
  const { data, isLoading } = useJobMatches(jobId, 5);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const assignPrinter = useMutation({
    mutationFn: async (printerId: number) => {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId,
          status: 'matched',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign printer');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({
        title: "Printer Assigned",
        description: "The printer has been successfully assigned to your job.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Finding best matches...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.matches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No matching printers found. Try adjusting your job requirements.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Recommended Printers</h3>
        <p className="text-sm text-muted-foreground">
          Top {data.matches.length} matches based on your job requirements
        </p>
      </div>

      <div className="space-y-3">
        {data.matches.map((match) => (
          <PrinterMatchCard
            key={match.printer.id}
            match={match}
            isSelected={match.printer.id === currentPrinterId}
            onSelect={() => {
              if (onSelectPrinter) {
                onSelectPrinter(match.printer.id);
              } else {
                assignPrinter.mutate(match.printer.id);
              }
            }}
            isAssigning={assignPrinter.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface PrinterMatchCardProps {
  match: MatchScore;
  isSelected: boolean;
  onSelect: () => void;
  isAssigning: boolean;
}

function PrinterMatchCard({ match, isSelected, onSelect, isAssigning }: PrinterMatchCardProps) {
  const { printer, score, reasons, estimatedCost } = match;
  const rating = parseFloat(printer.rating || '0');

  return (
    <Card className={isSelected ? "border-primary" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{printer.name}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{printer.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span>{printer.completedJobs} jobs</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{score}</div>
            <div className="text-xs text-muted-foreground">Match Score</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={score} className="h-2" />

        <div className="flex flex-wrap gap-1.5">
          {reasons.map((reason, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {reason}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Materials:</span>
          <span className="font-medium">{printer.materials.join(', ')}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">${estimatedCost.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                ${parseFloat(printer.pricePerGram).toFixed(3)}/gram
              </div>
            </div>
          </div>

          <Button
            onClick={onSelect}
            disabled={isSelected || isAssigning}
            size="sm"
          >
            {isSelected ? "Selected" : "Select Printer"}
          </Button>
        </div>

        {printer.description && (
          <CardDescription className="text-xs pt-2 border-t">
            {printer.description}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
