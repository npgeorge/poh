import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Clock, Package, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Bid, Job } from "@shared/schema";

interface BidWithJob extends Bid {
  job: Job;
}

interface MyBidsProps {
  printerIds: number[];
}

export function MyBids({ printerIds }: MyBidsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch bids for all printers owned by the user
  const { data: allBids = [], isLoading } = useQuery<BidWithJob[]>({
    queryKey: ["/api/printers/bids", printerIds],
    queryFn: async () => {
      if (printerIds.length === 0) return [];

      // Fetch bids for each printer and combine
      const bidsArrays = await Promise.all(
        printerIds.map(async (printerId) => {
          const response = await apiRequest("GET", `/api/printers/${printerId}/bids`, {});
          return response.json();
        })
      );

      return bidsArrays.flat();
    },
    enabled: printerIds.length > 0,
  });

  const withdrawBidMutation = useMutation({
    mutationFn: async (bidId: number) => {
      const response = await apiRequest("PUT", `/api/bids/${bidId}/withdraw`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers/bids"] });
      toast({
        title: "Bid Withdrawn",
        description: "Your bid has been withdrawn successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Withdraw Bid",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading your bids...</p>
        </CardContent>
      </Card>
    );
  }

  if (allBids.length === 0) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              You haven't submitted any bids yet. Check out available jobs above!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingBids = allBids.filter(b => b.status === 'pending');
  const acceptedBids = allBids.filter(b => b.status === 'accepted');
  const otherBids = allBids.filter(b => !['pending', 'accepted'].includes(b.status));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
          My Bids ({allBids.length})
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track your submitted bids and their status
        </p>
      </div>

      <div className="space-y-4">
        {acceptedBids.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-600 mb-2">Accepted</h4>
            <div className="space-y-2">
              {acceptedBids.map((bid) => (
                <BidCard key={bid.id} bid={bid} onWithdraw={() => {}} canWithdraw={false} />
              ))}
            </div>
          </div>
        )}

        {pendingBids.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-yellow-600 mb-2">Pending</h4>
            <div className="space-y-2">
              {pendingBids.map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  onWithdraw={() => withdrawBidMutation.mutate(bid.id)}
                  canWithdraw={true}
                  isWithdrawing={withdrawBidMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {otherBids.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Other</h4>
            <div className="space-y-2">
              {otherBids.map((bid) => (
                <BidCard key={bid.id} bid={bid} onWithdraw={() => {}} canWithdraw={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface BidCardProps {
  bid: BidWithJob;
  onWithdraw: () => void;
  canWithdraw: boolean;
  isWithdrawing?: boolean;
}

function BidCard({ bid, onWithdraw, canWithdraw, isWithdrawing }: BidCardProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
    accepted: { icon: CheckCircle, color: 'bg-green-500', label: 'Accepted' },
    rejected: { icon: XCircle, color: 'bg-red-500', label: 'Rejected' },
    withdrawn: { icon: AlertCircle, color: 'bg-gray-500', label: 'Withdrawn' },
    expired: { icon: AlertCircle, color: 'bg-gray-500', label: 'Expired' },
  };

  const config = statusConfig[bid.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm text-black dark:text-white">
              {bid.job.fileName || `Job #${bid.jobId}`}
            </CardTitle>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Submitted {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString() : 'recently'}
            </p>
          </div>
          <Badge className={`${config.color} text-white border-0`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-sm font-bold text-black dark:text-white">
                ${parseFloat(bid.amount).toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Your Bid</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-sm font-bold text-black dark:text-white">
                {bid.estimatedCompletionDays} days
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Estimated</div>
            </div>
          </div>
        </div>

        {bid.notes && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
              Your note: "{bid.notes}"
            </p>
          </div>
        )}

        {canWithdraw && (
          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-800">
            <Button
              onClick={onWithdraw}
              disabled={isWithdrawing}
              variant="outline"
              size="sm"
              className="border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw Bid"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
