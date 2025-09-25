import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Zap, 
  Clock, 
  CheckCircle, 
  Printer, 
  Upload,
  TrendingUp,
  DollarSign,
  Eye,
  Star,
  Brain,
  Camera,
  AlertTriangle,
  CheckCircle2,
  TrendingDown
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const JOB_STATUS_CONFIG = {
  pending: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
  matched: { color: "bg-blue-500", icon: Printer, label: "Matched" },
  printing: { color: "bg-purple-500", icon: Printer, label: "Printing" },
  completed: { color: "bg-green-500", icon: CheckCircle, label: "Completed" },
  cancelled: { color: "bg-red-500", icon: Clock, label: "Cancelled" },
};

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: myJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/jobs/my"],
    enabled: !!user,
  });

  const { data: myPrinters = [] } = useQuery({
    queryKey: ["/api/printers/my"],
    enabled: !!user,
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
    enabled: !!user,
  });

  const updateJobMutation = useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: number; updates: any }) => {
      const response = await apiRequest("PUT", `/api/jobs/${jobId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Updated",
        description: "Job status has been updated successfully.",
      });
      // Invalidate queries to refresh data
      useQueryClient().invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update job. Please try again.",
        variant: "destructive",
      });
    },
  });

  const analyzeQualityMutation = useMutation({
    mutationFn: async ({ jobId }: { jobId: number }) => {
      const response = await apiRequest("POST", `/api/jobs/${jobId}/analyze-quality`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI Analysis Complete",
        description: `Quality score: ${data.analysis.overallScore}/100 with ${data.analysis.defects.length} defects detected.`,
      });
      // Invalidate queries to refresh data
      useQueryClient().invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to analyze quality photos. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadQualityPhotosMutation = useMutation({
    mutationFn: async ({ jobId, photoUrls }: { jobId: number; photoUrls: string[] }) => {
      const response = await apiRequest("POST", `/api/jobs/${jobId}/quality-photos`, { photoUrls });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Photos Uploaded",
        description: "Quality photos uploaded successfully. You can now run AI analysis.",
      });
      // Invalidate queries to refresh data
      useQueryClient().invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to upload quality photos. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test Lightning endpoint
  const testLightningMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/test-lightning", {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Lightning Test Successful",
        description: `Created test invoice for 1000 sats: ${data.invoice?.payment_request?.substring(0, 50)}...`,
      });
    },
    onError: (error) => {
      toast({
        title: "Lightning Test Failed", 
        description: "Failed to create test Lightning invoice. Check API configuration.",
        variant: "destructive",
      });
    },
  });

  const handleAcceptJob = (jobId: number, job: any) => {
    // Check if user has any printers registered
    if (!myPrinters || myPrinters.length === 0) {
      toast({
        title: "No Printers Registered",
        description: "You need to register a 3D printer before accepting jobs.",
        variant: "destructive",
      });
      return;
    }

    // Find a compatible printer that supports the job's material
    const compatiblePrinter = myPrinters.find((printer: any) => 
      printer.status === 'available' && 
      printer.materials.includes(job.material)
    );

    if (!compatiblePrinter) {
      toast({
        title: "No Compatible Printer",
        description: `None of your printers support ${job.material} or are currently available.`,
        variant: "destructive",
      });
      return;
    }

    updateJobMutation.mutate({
      jobId,
      updates: { status: "matched", printerId: compatiblePrinter.id }
    });
  };

  const handleCompleteJob = (jobId: number) => {
    updateJobMutation.mutate({
      jobId,
      updates: { status: "completed" }
    });
  };

  const handleAnalyzeQuality = (jobId: number) => {
    analyzeQualityMutation.mutate({ jobId });
  };

  const handleUploadQualityPhotos = (jobId: number) => {
    // For MVP, we'll simulate photo upload with mock URLs
    // In production, this would integrate with the file upload system
    const mockPhotoUrls = [
      'https://example.com/quality-photo-1.jpg',
      'https://example.com/quality-photo-2.jpg'
    ];
    uploadQualityPhotosMutation.mutate({ jobId, photoUrls: mockPhotoUrls });
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getQualityScoreIcon = (score: number) => {
    if (score >= 90) return CheckCircle2;
    if (score >= 80) return Star;
    if (score >= 70) return Eye;
    if (score >= 60) return AlertTriangle;
    return TrendingDown;
  };

  const renderQualityAnalysis = (job: any) => {
    const hasQualityPhotos = job.qualityPhotos && Array.isArray(job.qualityPhotos) && job.qualityPhotos.length > 0;
    const hasQualityScore = job.qualityScore !== null && job.qualityScore !== undefined;
    const qualityScore = hasQualityScore ? parseFloat(job.qualityScore) : null;
    
    if (job.status !== 'completed') {
      return null;
    }

    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium text-muted-foreground">Quality Control</h5>
          {hasQualityScore && (
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">AI Analyzed</span>
            </div>
          )}
        </div>
        
        {hasQualityScore && qualityScore !== null && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              {(() => {
                const ScoreIcon = getQualityScoreIcon(qualityScore);
                return <ScoreIcon className={`w-5 h-5 ${getQualityScoreColor(qualityScore)}`} />;
              })()}
              <div>
                <div className={`text-lg font-bold ${getQualityScoreColor(qualityScore)}`}>
                  {qualityScore}/100
                </div>
                <div className="text-xs text-muted-foreground">Quality Score</div>
              </div>
            </div>
            
            {job.aiAnalysis && job.aiAnalysis.defects && (
              <div className="text-right">
                <div className="text-sm font-medium">
                  {job.aiAnalysis.defects.length} Defects
                </div>
                <div className="text-xs text-muted-foreground">Detected</div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex space-x-2">
          {!hasQualityPhotos && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleUploadQualityPhotos(job.id)}
              disabled={uploadQualityPhotosMutation.isPending}
              data-testid={`button-upload-photos-${job.id}`}
            >
              <Camera className="w-4 h-4 mr-2" />
              {uploadQualityPhotosMutation.isPending ? 'Uploading...' : 'Upload Photos'}
            </Button>
          )}
          
          {hasQualityPhotos && !hasQualityScore && (
            <Button 
              size="sm" 
              onClick={() => handleAnalyzeQuality(job.id)}
              disabled={analyzeQualityMutation.isPending}
              data-testid={`button-analyze-quality-${job.id}`}
            >
              <Brain className="w-4 h-4 mr-2" />
              {analyzeQualityMutation.isPending ? 'Analyzing...' : 'AI Analysis'}
            </Button>
          )}
          
          {hasQualityPhotos && (
            <Button 
              size="sm" 
              variant="outline"
              data-testid={`button-view-photos-${job.id}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Photos ({job.qualityPhotos.length})
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate stats
  const activeJobs = myJobs.filter((job: any) => ['pending', 'matched', 'printing'].includes(job.status));
  const completedJobs = myJobs.filter((job: any) => job.status === 'completed');
  const availablePrinters = myPrinters.filter((printer: any) => printer.status === 'available');
  const totalEarnings = completedJobs.reduce((sum: number, job: any) => sum + (parseFloat(job.finalCost || job.estimatedCost || '0')), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/" data-testid="link-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => testLightningMutation.mutate()}
                disabled={testLightningMutation.isPending}
                variant="outline"
                size="sm"
                data-testid="button-test-lightning"
              >
                <Zap className="w-4 h-4 mr-2" />
                {testLightningMutation.isPending ? "Testing..." : "Test Lightning"}
              </Button>
              <Badge variant="secondary">
                {user?.firstName || user?.email}
              </Badge>
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
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-jobs">
                {activeJobs.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-completed-jobs">
                {completedJobs.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Total finished jobs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Printer className="w-4 h-4 mr-2" />
                My Printers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-my-printers">
                {availablePrinters.length}/{myPrinters.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Available/Total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-earnings">
                ${totalEarnings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total earned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="my-jobs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-jobs" data-testid="tab-my-jobs">My Jobs</TabsTrigger>
            <TabsTrigger value="available-jobs" data-testid="tab-available-jobs">Available Jobs</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* My Jobs Tab */}
          <TabsContent value="my-jobs" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">My Print Jobs</h3>
              <Button asChild size="sm">
                <Link href="/upload" data-testid="button-new-job">
                  <Upload className="w-4 h-4 mr-2" />
                  New Job
                </Link>
              </Button>
            </div>

            {jobsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : myJobs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Jobs Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Upload your first STL file to get started with 3D printing.
                  </p>
                  <Button asChild>
                    <Link href="/upload" data-testid="button-first-job">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload STL File
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myJobs.map((job: any) => {
                  const statusConfig = JOB_STATUS_CONFIG[job.status as keyof typeof JOB_STATUS_CONFIG];
                  const StatusIcon = statusConfig?.icon || Clock;
                  
                  return (
                    <Card key={job.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${statusConfig?.color || 'bg-gray-500'}`}></div>
                            <div>
                              <h4 className="font-semibold" data-testid={`job-name-${job.id}`}>
                                {job.fileName || `Job #${job.id}`}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {job.material} • {job.estimatedWeight}g • Created {new Date(job.createdAt).toLocaleDateString()}
                              </p>
                              {job.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{job.notes}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="font-semibold text-primary">
                                ${job.finalCost || job.estimatedCost || '—'}
                              </div>
                              <Badge variant="outline" className="flex items-center space-x-1">
                                <StatusIcon className="w-3 h-3" />
                                <span data-testid={`job-status-${job.id}`}>{statusConfig?.label || job.status}</span>
                              </Badge>
                            </div>
                            
                            {job.status === 'printing' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleCompleteJob(job.id)}
                                disabled={updateJobMutation.isPending}
                                data-testid={`button-complete-${job.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Quality Analysis Component */}
                        {renderQualityAnalysis(job)}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Available Jobs Tab */}
          <TabsContent value="available-jobs" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Available Print Jobs</h3>
              <Badge variant="outline" data-testid="available-jobs-count">
                {allJobs.filter((job: any) => job.status === 'pending').length} pending jobs
              </Badge>
            </div>

            {myPrinters.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Printer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Register a Printer First</h3>
                  <p className="text-muted-foreground mb-6">
                    You need to register at least one 3D printer to accept print jobs.
                  </p>
                  <Button asChild>
                    <Link href="/printers" data-testid="button-register-printer">
                      <Printer className="w-4 h-4 mr-2" />
                      Register Printer
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allJobs
                  .filter((job: any) => job.status === 'pending' && job.customerId !== user?.id)
                  .map((job: any) => (
                    <Card key={job.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-semibold" data-testid={`available-job-name-${job.id}`}>
                                {job.fileName || `Job #${job.id}`}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {job.material} • {job.estimatedWeight}g • Posted {new Date(job.createdAt).toLocaleDateString()}
                              </p>
                              {job.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{job.notes}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="font-semibold text-primary">
                                ${job.estimatedCost || '—'}
                              </div>
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                            
                            <Button 
                              size="sm" 
                              onClick={() => handleAcceptJob(job.id, job)}
                              disabled={updateJobMutation.isPending}
                              data-testid={`button-accept-${job.id}`}
                            >
                              <Printer className="w-4 h-4 mr-2" />
                              Accept Job
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                
                {allJobs.filter((job: any) => job.status === 'pending' && job.customerId !== user?.id).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Eye className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Available Jobs</h3>
                      <p className="text-muted-foreground">
                        Check back later for new print jobs from customers.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <h3 className="text-lg font-semibold">Performance Analytics</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Job Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Jobs</span>
                    <span className="font-semibold" data-testid="analytics-total-jobs">{myJobs.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Completed Jobs</span>
                    <span className="font-semibold" data-testid="analytics-completed-jobs">{completedJobs.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-semibold" data-testid="analytics-success-rate">
                      {myJobs.length > 0 ? Math.round((completedJobs.length / myJobs.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Job Value</span>
                    <span className="font-semibold" data-testid="analytics-avg-value">
                      ${completedJobs.length > 0 ? (totalEarnings / completedJobs.length).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5" />
                    <span>Printer Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Active Printers</span>
                    <span className="font-semibold" data-testid="analytics-active-printers">{availablePrinters.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Printers</span>
                    <span className="font-semibold" data-testid="analytics-total-printers">{myPrinters.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Rating</span>
                    <span className="font-semibold" data-testid="analytics-avg-rating">
                      {myPrinters.length > 0 
                        ? (myPrinters.reduce((sum: number, p: any) => sum + (parseFloat(p.rating || '0')), 0) / myPrinters.length).toFixed(1)
                        : '0.0'
                      }/5.0
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Earnings</span>
                    <span className="font-semibold text-primary" data-testid="analytics-total-earnings">
                      ${totalEarnings.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
