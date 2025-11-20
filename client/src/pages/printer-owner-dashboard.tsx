import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, Clock, CheckCircle, Package, ArrowRight, User, LogOut, Plus, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AvailableJobs } from "@/components/AvailableJobs";
import { MyBids } from "@/components/MyBids";
import type { Job, Printer } from "@shared/schema";

const JOB_STATUS_CONFIG = {
  pending: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
  matched: { color: "bg-blue-500", icon: Package, label: "Matched" },
  printing: { color: "bg-orange-500", icon: Box, label: "Printing" },
  completed: { color: "bg-green-500", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-gray-500", icon: Clock, label: "Cancelled" },
};

export default function PrinterOwnerDashboard() {
  const { user, switchRole, isSwitchingRole } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Error",
        description: "Logout failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { data: myPrinters = [], isLoading: printersLoading } = useQuery<Printer[]>({
    queryKey: ["/api/printers/my"],
    enabled: !!user,
  });

  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: !!user,
  });

  // Filter jobs assigned to my printers
  const myPrinterIds = myPrinters.map((p) => p.id);
  const myJobs = allJobs.filter((job) => 
    job.printerId && myPrinterIds.includes(job.printerId)
  );

  const activeJobs = myJobs.filter((job) => 
    ['matched', 'printing'].includes(job.status)
  );
  const completedJobs = myJobs.filter((job) => job.status === 'completed');

  // Calculate earnings (placeholder logic - would need pricing info from jobs)
  const totalEarnings = completedJobs.length * 25; // Rough estimate

  const canSwitchToCustomer = user?.roles?.includes('customer');

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b-2 border-black dark:border-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white" data-testid="header-title">
                Printer Owner Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="header-subtitle">
                Manage your 3D printers, {user?.firstName || 'Owner'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {canSwitchToCustomer && (
                <Button 
                  onClick={() => switchRole('customer')}
                  disabled={isSwitchingRole}
                  variant="outline"
                  className="border-2 border-black dark:border-white"
                  data-testid="button-switch-role"
                >
                  <User className="w-4 h-4 mr-2" />
                  Switch to Customer
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-2 border-black dark:border-white"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-2 border-black dark:border-white" data-testid="card-printers">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <Box className="w-5 h-5 text-orange-500" />
                My Printers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-black dark:text-white" data-testid="stat-printers">
                {printersLoading ? '...' : myPrinters.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black dark:border-white" data-testid="card-active-jobs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <Clock className="w-5 h-5 text-orange-500" />
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-black dark:text-white" data-testid="stat-active-jobs">
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

          <Card className="border-2 border-black dark:border-white" data-testid="card-earnings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                <DollarSign className="w-5 h-5 text-green-500" />
                Earnings (Est.)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-black dark:text-white" data-testid="stat-earnings">
                ${totalEarnings}
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
            <Link href="/printer-owner/printers">
              <Button 
                className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                data-testid="button-manage-printers"
              >
                <Box className="w-4 h-4 mr-2" />
                Manage Printers
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-2 border-black dark:border-white opacity-50 cursor-not-allowed"
              disabled
              data-testid="button-view-jobs"
            >
              <Package className="w-4 h-4 mr-2" />
              View Jobs (See Below)
            </Button>
          </CardContent>
        </Card>

        {/* My Printers Overview */}
        <Card className="border-2 border-black dark:border-white mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-black dark:text-white">My Printers</CardTitle>
            <Link href="/printer-owner/printers">
              <Button 
                variant="ghost" 
                size="sm"
                data-testid="button-view-all-printers"
              >
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {printersLoading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading printers...</p>
            ) : myPrinters.length === 0 ? (
              <div className="text-center py-8">
                <Box className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No printers registered yet</p>
                <Link href="/printer-owner/printers">
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white border-0"
                    data-testid="button-add-first-printer"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Printer
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myPrinters.slice(0, 6).map((printer) => (
                  <div 
                    key={printer.id} 
                    className="p-4 border-2 border-gray-200 dark:border-gray-800"
                    data-testid={`printer-${printer.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Box className="w-6 h-6 text-orange-500" />
                      <Badge 
                        className={`${printer.status === 'available' ? 'bg-green-500' : 'bg-gray-500'} text-white border-0`}
                        data-testid={`printer-status-${printer.id}`}
                      >
                        {printer.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-black dark:text-white mb-1" data-testid={`printer-name-${printer.id}`}>
                      {printer.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {printer.location}
                    </p>
                    <p className="text-sm text-orange-500 font-semibold mt-2">
                      ${printer.pricePerGram}/g
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bidding Section */}
        {myPrinters.length > 0 && (
          <>
            <Card className="border-2 border-black dark:border-white mb-8">
              <CardHeader>
                <CardTitle className="text-black dark:text-white">Job Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <AvailableJobs printers={myPrinters} />
              </CardContent>
            </Card>

            <Card className="border-2 border-black dark:border-white mb-8">
              <CardHeader>
                <CardTitle className="text-black dark:text-white">My Bids</CardTitle>
              </CardHeader>
              <CardContent>
                <MyBids printerIds={myPrinterIds} />
              </CardContent>
            </Card>
          </>
        )}

        {/* Recent Jobs */}
        <Card className="border-2 border-black dark:border-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-black dark:text-white">Recent Jobs</CardTitle>
            {myJobs.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="cursor-not-allowed opacity-50"
                data-testid="button-view-all-jobs"
              >
                View All <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <p className="text-gray-600 dark:text-gray-400">Loading jobs...</p>
            ) : myJobs.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">No jobs assigned yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myJobs.slice(0, 5).map((job) => {
                  const statusConfig = JOB_STATUS_CONFIG[job.status as keyof typeof JOB_STATUS_CONFIG] || JOB_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div 
                      key={job.id} 
                      className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-800"
                      data-testid={`job-${job.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <StatusIcon className="w-6 h-6 text-orange-500" />
                        <div>
                          <p className="font-semibold text-black dark:text-white" data-testid={`job-name-${job.id}`}>
                            {job.fileName || `Job #${job.id}`}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Date unknown'}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        className={`${statusConfig.color} text-white border-0`}
                        data-testid={`job-status-${job.id}`}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
