import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Printer, 
  BarChart3, 
  Settings,
  Plus,
  Zap,
  Clock,
  CheckCircle
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Job, Printer as PrinterType } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();

  const { data: myJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs/my"],
    enabled: !!user,
  });

  const { data: myPrinters = [] } = useQuery<PrinterType[]>({
    queryKey: ["/api/printers/my"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <Badge variant="secondary">
                Welcome back, {user?.firstName || user?.email}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button asChild variant="outline">
                <Link href="/dashboard" data-testid="link-dashboard">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="/api/logout" data-testid="button-logout">
                  Logout
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Upload & Print</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your STL file and get matched with local 3D printer owners.
                  </p>
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href="/upload" data-testid="button-upload-stl">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload STL File
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                  <Printer className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">Register Printer</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your 3D printer to our network and start earning Bitcoin.
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/printers" data-testid="button-register-printer">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Printer
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-jobs">
                {myJobs.filter((job: any) => ['pending', 'matched', 'printing'].includes(job.status)).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My Printers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-my-printers">
                {myPrinters.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered devices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-jobs">
                {myJobs.length}
              </div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Jobs
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard" data-testid="link-view-all-jobs">
                    View All
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No jobs yet</p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href="/upload" data-testid="button-create-first-job">
                      Create your first job
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <div>
                          <p className="font-medium" data-testid={`job-name-${job.id}`}>
                            {job.fileName || `Job #${job.id}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {job.material} • {job.estimatedWeight}g
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'printing' ? 'secondary' :
                            'outline'
                          }
                          data-testid={`job-status-${job.id}`}
                        >
                          {job.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {job.status === 'printing' && <Printer className="w-3 h-3 mr-1" />}
                          {job.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Printers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                My Printers
                <Button asChild variant="outline" size="sm">
                  <Link href="/printers" data-testid="link-manage-printers">
                    Manage
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myPrinters.length === 0 ? (
                <div className="text-center py-8">
                  <Printer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No printers registered</p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href="/printers" data-testid="button-add-first-printer">
                      Add your first printer
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myPrinters.slice(0, 3).map((printer) => (
                    <div key={printer.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                          <Printer className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`printer-name-${printer.id}`}>
                            {printer.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {printer.location}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={printer.status === 'available' ? 'default' : 'secondary'}
                          data-testid={`printer-status-${printer.id}`}
                        >
                          {printer.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
