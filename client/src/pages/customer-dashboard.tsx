import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, Box, Clock, CheckCircle, Package, ArrowRight, User, LogOut, CreditCard, ChevronDown, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Job, Printer } from "@shared/schema";
import { EscrowStatus } from "@/components/EscrowStatus";
import { PrinterMatches } from "@/components/PrinterMatches";
import { DisputeDialog } from "@/components/DisputeDialog";
import { DisputeList } from "@/components/DisputeList";
import { useState } from "react";

const JOB_STATUS_CONFIG = {
  pending: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
  matched: { color: "bg-blue-500", icon: Package, label: "Matched" },
  printing: { color: "bg-orange-500", icon: Box, label: "Printing" },
  completed: { color: "bg-green-500", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-gray-500", icon: Clock, label: "Cancelled" },
};

export default function CustomerDashboard() {
  const { user, switchRole, isSwitchingRole } = useAuth();
  const { toast } = useToast();

  const { data: myJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs/my"],
    enabled: !!user,
  });

  const { data: printers = [] } = useQuery<Printer[]>({
    queryKey: ["/api/printers"],
    enabled: !!user,
  });

  const activeJobs = myJobs.filter((job) => 
    ['pending', 'matched', 'printing'].includes(job.status)
  );
  const completedJobs = myJobs.filter((job) => job.status === 'completed');

  const canSwitchToPrinterOwner = user?.roles?.includes('printer_owner');

  const resumePaymentMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest("POST", `/api/jobs/${jobId}/payment`, {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast({
          title: "Redirecting to Payment",
          description: "Taking you to the checkout page...",
        });
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Error",
          description: "Failed to create payment link",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resume payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b-2 border-black dark:border-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white" data-testid="header-title">
                Customer Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="header-subtitle">
                Welcome back, {user?.firstName || 'Builder'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {canSwitchToPrinterOwner && (
                <Button 
                  onClick={() => switchRole('printer_owner')}
                  disabled={isSwitchingRole}
                  variant="outline"
                  className="border-2 border-black dark:border-white"
                  data-testid="button-switch-role"
                >
                  <User className="w-4 h-4 mr-2" />
                  Switch to Printer Owner
                </Button>
              )}
              <a href="/api/logout">
                <Button 
                  variant="outline"
                  className="border-2 border-black dark:border-white"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-black dark:border-white" data-testid="card-active-orders">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <Clock className="w-5 h-5 text-orange-500" />
                Active Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-black dark:text-white" data-testid="stat-active-orders">
                {jobsLoading ? '...' : activeJobs.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black dark:border-white" data-testid="card-completed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-black dark:text-white" data-testid="stat-completed">
                {jobsLoading ? '...' : completedJobs.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black dark:border-white" data-testid="card-printers">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <Box className="w-5 h-5 text-orange-500" />
                Available Printers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-black dark:text-white" data-testid="stat-printers">
                {printers.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-2 border-black dark:border-white mb-8">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link href="/customer/upload">
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                data-testid="button-upload-stl"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload STL File
              </Button>
            </Link>
            <Link href="/customer/printers">
              <Button 
                variant="outline"
                className="border-2 border-black dark:border-white"
                data-testid="button-browse-printers"
              >
                <Box className="w-4 h-4 mr-2" />
                Browse Printers
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="border-2 border-black dark:border-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-black dark:text-white">Recent Orders</CardTitle>
                {myJobs.length > 0 && (
                  <Link href="/customer/orders">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="button-view-all-orders"
                    >
                      View All <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
                ) : myJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Box className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">No orders yet</p>
                    <Link href="/customer/upload">
                      <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                        data-testid="button-first-upload"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Your First STL
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myJobs.slice(0, 5).map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-2 border-black dark:border-white">
              <CardHeader>
                <CardTitle className="text-black dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Disputes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DisputeList />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const resumePaymentMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest("POST", `/api/jobs/${jobId}/payment`, {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast({
          title: "Redirecting to Payment",
          description: "Taking you to the checkout page...",
        });
        window.location.href = data.checkoutUrl;
      }
    },
  });

  const statusConfig = JOB_STATUS_CONFIG[job.status as keyof typeof JOB_STATUS_CONFIG] || JOB_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const needsPayment = ['pending', 'expired'].includes(job.paymentStatus || '') || (!job.paymentStatus && job.status === 'pending');
  const isPaid = job.paymentStatus === 'paid';
  const showMatches = isPaid && job.status === 'matched' && !job.printerId;
  const showEscrow = isPaid && job.status !== 'pending';

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="border-2 border-gray-200 dark:border-gray-800"
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <StatusIcon className="w-6 h-6 text-orange-500" />
            <div className="flex-1">
              <p className="font-semibold text-black dark:text-white" data-testid={`order-name-${job.id}`}>
                {job.fileName || `Order #${job.id}`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Date unknown'}
              </p>
              {job.paymentStatus && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1" data-testid={`payment-status-${job.id}`}>
                  Payment: {job.paymentStatus}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {needsPayment && (
              <Button
                onClick={() => resumePaymentMutation.mutate(job.id)}
                disabled={resumePaymentMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                size="sm"
                data-testid={`button-pay-${job.id}`}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {resumePaymentMutation.isPending ? 'Loading...' : 'Pay Now'}
              </Button>
            )}

            {(showMatches || showEscrow || job.status === 'completed') && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            )}

            <Badge
              className={`${statusConfig.color} text-white border-0`}
              data-testid={`order-status-${job.id}`}
            >
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        <CollapsibleContent className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
          {showMatches && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Suggested Printers</h4>
              <PrinterMatches jobId={job.id} currentPrinterId={job.printerId || undefined} />
            </div>
          )}

          {showEscrow && (
            <div>
              <EscrowStatus
                jobId={job.id}
                jobStatus={job.status}
                qualityScore={job.qualityScore || undefined}
                isCustomer={true}
              />
            </div>
          )}

          {(job.status === 'printing' || job.status === 'completed') && (
            <div className="flex justify-end">
              <DisputeDialog
                jobId={job.id}
                jobName={job.fileName || undefined}
              />
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
