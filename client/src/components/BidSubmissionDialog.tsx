import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import type { Job, Printer } from "@shared/schema";

interface BidSubmissionDialogProps {
  job: Job;
  printers: Printer[];
  trigger?: React.ReactNode;
}

export function BidSubmissionDialog({ job, printers, trigger }: BidSubmissionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [printerId, setPrinterId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [estimatedDays, setEstimatedDays] = useState<string>("3");
  const [notes, setNotes] = useState<string>("");

  const submitBidMutation = useMutation({
    mutationFn: async () => {
      if (!printerId || !amount || !estimatedDays) {
        throw new Error("Please fill in all required fields");
      }

      const response = await apiRequest("POST", `/api/jobs/${job.id}/bids`, {
        printerId: parseInt(printerId),
        amount: parseFloat(amount),
        estimatedCompletionDays: parseInt(estimatedDays),
        notes: notes.trim() || undefined,
      });

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${job.id}/bids`] });
      toast({
        title: "Bid Submitted",
        description: "Your bid has been submitted successfully.",
      });
      setOpen(false);
      // Reset form
      setPrinterId("");
      setAmount("");
      setEstimatedDays("3");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Submit Bid",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitBidMutation.mutate();
  };

  const availablePrinters = printers.filter(p => p.status === 'available');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white border-0"
            size="sm"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Submit Bid
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit a Bid</DialogTitle>
          <DialogDescription>
            Submit a competitive bid for "{job.fileName || `Job #${job.id}`}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {availablePrinters.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You need to have at least one available printer to submit bids.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="printer">Select Printer *</Label>
                <Select value={printerId} onValueChange={setPrinterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a printer" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrinters.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id.toString()}>
                        {printer.name} ({printer.location})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Bid Amount (USD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="25.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Enter your total price including materials and shipping
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="days">Estimated Completion Time (days) *</Label>
                <Select value={estimatedDays} onValueChange={setEstimatedDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="2">2 days</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about materials, quality, or special considerations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {notes.length}/500 characters
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitBidMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitBidMutation.isPending || !printerId || !amount || !estimatedDays}
                  className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                >
                  {submitBidMutation.isPending ? "Submitting..." : "Submit Bid"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
