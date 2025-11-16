import { useState } from "react";
import { useCreateDispute } from "@/hooks/useDisputes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DisputeDialogProps {
  jobId: number;
  jobName?: string;
  trigger?: React.ReactNode;
}

const DISPUTE_TYPES = [
  { value: 'quality', label: 'Quality Issues' },
  { value: 'delivery', label: 'Delivery Problems' },
  { value: 'specification', label: 'Specification Mismatch' },
  { value: 'communication', label: 'Communication Issues' },
  { value: 'payment', label: 'Payment Concerns' },
  { value: 'other', label: 'Other' },
];

export function DisputeDialog({ jobId, jobName, trigger }: DisputeDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const createDispute = useCreateDispute();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!type || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select a dispute type and provide a description.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDispute.mutateAsync({
        jobId,
        type,
        description: description.trim(),
      });

      toast({
        title: "Dispute Filed",
        description: "Your dispute has been submitted and is under review.",
      });

      setOpen(false);
      setType('');
      setDescription('');
    } catch (error: any) {
      toast({
        title: "Failed to File Dispute",
        description: error.message || "An error occurred while filing the dispute.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <AlertTriangle className="h-4 w-4 mr-2" />
            File Dispute
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>File a Dispute</DialogTitle>
            <DialogDescription>
              {jobName ? `Filing a dispute for "${jobName}"` : `Filing a dispute for Job #${jobId}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dispute-type">Dispute Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="dispute-type">
                  <SelectValue placeholder="Select dispute type" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_TYPES.map((disputeType) => (
                    <SelectItem key={disputeType.value} value={disputeType.value}>
                      {disputeType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed information about the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Be as specific as possible. Include dates, details, and any relevant information.
              </p>
            </div>

            <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-100">
                  <p className="font-medium mb-1">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Filing a dispute will place the escrow payment on hold</li>
                    <li>Both parties will be notified</li>
                    <li>Provide accurate information to expedite resolution</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createDispute.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!type || !description.trim() || createDispute.isPending}
            >
              {createDispute.isPending ? "Filing..." : "File Dispute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
