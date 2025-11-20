import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BidSubmissionDialog } from "@/components/BidSubmissionDialog";
import { Package, Clock, DollarSign } from "lucide-react";
import type { Job, Printer } from "@shared/schema";

interface AvailableJobsProps {
  printers: Printer[];
}

export function AvailableJobs({ printers }: AvailableJobsProps) {
  const { data: allJobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  // Filter jobs that are open for bidding (paid, no printer assigned, status pending/matched)
  const availableJobs = allJobs.filter(
    (job) =>
      job.paymentStatus === 'paid' &&
      !job.printerId &&
      ['pending', 'matched'].includes(job.status)
  );

  if (isLoading) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading available jobs...</p>
        </CardContent>
      </Card>
    );
  }

  if (availableJobs.length === 0) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              No jobs available for bidding at the moment. Check back soon!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
          Available Jobs ({availableJobs.length})
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Submit competitive bids on open print jobs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableJobs.map((job) => (
          <JobCard key={job.id} job={job} printers={printers} />
        ))}
      </div>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  printers: Printer[];
}

function JobCard({ job, printers }: JobCardProps) {
  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-black dark:text-white">
          {job.fileName || `Job #${job.id}`}
        </CardTitle>
        <CardDescription className="flex items-center gap-2 text-sm">
          <Clock className="h-3.5 w-3.5" />
          Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'recently'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {job.material && (
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Material:</span>
              <span className="font-medium text-black dark:text-white">{job.material}</span>
            </div>
          )}

          {job.estimatedCost && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">Estimated:</span>
              <span className="font-medium text-black dark:text-white">
                ${parseFloat(job.estimatedCost).toFixed(2)}
              </span>
            </div>
          )}

          {job.quantity && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
              <Badge variant="secondary" className="text-xs">
                {job.quantity}x
              </Badge>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
          <BidSubmissionDialog job={job} printers={printers} />
        </div>
      </CardContent>
    </Card>
  );
}
