import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Box, Clock, CheckCircle, Package, ArrowRight, User, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Job, Printer } from "@shared/schema";

const JOB_STATUS_CONFIG = {
  pending: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
  matched: { color: "bg-blue-500", icon: Package, label: "Matched" },
  printing: { color: "bg-orange-500", icon: Box, label: "Printing" },
  completed: { color: "bg-green-500", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-gray-500", icon: Clock, label: "Cancelled" },
};

export default function CustomerDashboard() {
  const { user, switchRole, isSwitchingRole } = useAuth();

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
                {myJobs.slice(0, 5).map((job) => {
                  const statusConfig = JOB_STATUS_CONFIG[job.status as keyof typeof JOB_STATUS_CONFIG] || JOB_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div 
                      key={job.id} 
                      className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-800"
                      data-testid={`order-${job.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <StatusIcon className="w-6 h-6 text-orange-500" />
                        <div>
                          <p className="font-semibold text-black dark:text-white" data-testid={`order-name-${job.id}`}>
                            {job.fileName || `Order #${job.id}`}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Date unknown'}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        className={`${statusConfig.color} text-white border-0`}
                        data-testid={`order-status-${job.id}`}
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
