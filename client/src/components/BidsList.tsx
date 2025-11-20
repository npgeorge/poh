import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Star, MapPin, DollarSign, Clock, Package, Briefcase } from "lucide-react";
import type { Bid, Printer } from "@shared/schema";

interface BidsListProps {
  jobId: number;
  jobName?: string;
}

interface BidWithPrinter extends Bid {
  printer: Printer;
}

interface BidsResponse {
  bids: BidWithPrinter[];
  total: number;
  showing: number;
}

export function BidsList({ jobId, jobName }: BidsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<BidsResponse>({
    queryKey: [`/api/jobs/${jobId}/bids`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/jobs/${jobId}/bids`, {});
      return response.json();
    },
  });

  const acceptBidMutation = useMutation({
    mutationFn: async (bidId: number) => {
      const response = await apiRequest("PUT", `/api/bids/${bidId}/accept`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/my"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/bids`] });
      toast({
        title: "Bid Accepted",
        description: "The printer has been assigned to your job.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Accept Bid",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading bids...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.bids.length === 0) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No bids received yet. Printer owners will submit competitive bids soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-black dark:text-white">
            Competitive Bids {data.total > 3 && `(Showing Best 3 of ${data.total})`}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Sorted by best price and fastest delivery
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {data.bids.map((bid, index) => (
          <BidCard
            key={bid.id}
            bid={bid}
            rank={index + 1}
            onAccept={() => acceptBidMutation.mutate(bid.id)}
            isAccepting={acceptBidMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

interface BidCardProps {
  bid: BidWithPrinter;
  rank: number;
  onAccept: () => void;
  isAccepting: boolean;
}

function BidCard({ bid, rank, onAccept, isAccepting }: BidCardProps) {
  const { printer } = bid;
  const rating = parseFloat(printer.rating || '0');
  const isBestValue = rank === 1;

  return (
    <Card className={`border-2 ${isBestValue ? 'border-orange-500' : 'border-gray-200 dark:border-gray-800'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base text-black dark:text-white">
                {printer.name}
              </CardTitle>
              {isBestValue && (
                <Badge className="bg-orange-500 text-white border-0 text-xs">
                  Best Value
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-lg font-bold text-black dark:text-white">
                ${parseFloat(bid.amount).toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Price</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-lg font-bold text-black dark:text-white">
                {bid.estimatedCompletionDays} days
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Delivery Time</div>
            </div>
          </div>
        </div>

        {bid.notes && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
              "{bid.notes}"
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-800">
          <Package className="h-3.5 w-3.5" />
          <span>Materials: {printer.materials.join(', ')}</span>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={onAccept}
            disabled={isAccepting}
            className="bg-orange-500 hover:bg-orange-600 text-white border-0"
            size="sm"
          >
            {isAccepting ? "Accepting..." : "Accept Bid"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
