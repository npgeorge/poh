import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { STLViewer } from "@/components/STLViewer";
import { Upload, Box, Zap, ArrowLeft, Printer } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function UploadPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [stlFile, setStlFile] = useState<File | null>(null);
  const [stlUrl, setStlUrl] = useState<string>("");
  const [formData, setFormData] = useState({
    fileName: "",
    material: "",
    notes: "",
    estimatedWeight: ""
  });

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

  const { data: printers = [] } = useQuery({
    queryKey: ["/api/printers"],
    enabled: !!user,
  });

  const createJobMutation = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await apiRequest("POST", "/api/jobs", jobData);
      return response.json();
    },
    onSuccess: (newJob) => {
      toast({
        title: "Job Created Successfully",
        description: `Your print job has been created and is pending review.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setLocation("/customer/dashboard");
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
        description: "Failed to create job. Please try again.",
        variant: "destructive",
      });
    },
  });


  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.stl')) {
      toast({
        title: "Invalid file type",
        description: "Please select an STL file.",
        variant: "destructive",
      });
      return;
    }

    setStlFile(file);
    
    // Set file name if not already set
    if (!formData.fileName) {
      setFormData(prev => ({ ...prev, fileName: file.name.replace('.stl', '') }));
    }

    try {
      // Get upload parameters
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const data = await response.json();
      
      // Upload file directly
      const uploadResponse = await fetch(data.uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Set ACL policy for the uploaded file
      await apiRequest("PUT", "/api/stl-files", {
        stlFileURL: data.uploadURL
      });
      
      // Set the URL after ACL is set to trigger 3D viewer
      setStlUrl(data.uploadURL);
      
      toast({
        title: "File Uploaded",
        description: "Your STL file has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Error",
        description: "Failed to upload your STL file. Please try again.",
        variant: "destructive",
      });
      setStlFile(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stlUrl) {
      toast({
        title: "Missing STL File",
        description: "Please upload an STL file before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.material) {
      toast({
        title: "Missing Material",
        description: "Please select a material for printing.",
        variant: "destructive",
      });
      return;
    }

    const jobData = {
      stlFileUrl: stlUrl,
      fileName: formData.fileName || "Untitled",
      material: formData.material,
      notes: formData.notes,
      estimatedWeight: formData.estimatedWeight ? parseFloat(formData.estimatedWeight) : null,
      status: "pending"
    };

    createJobMutation.mutate(jobData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="industrial-spinner-lg text-primary"></div>
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/" data-testid="link-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Upload & Print</h1>
            </div>
            
            <div className="flex items-center space-x-4">
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
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Upload STL File</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>STL File</Label>
                  <div className="mt-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".stl"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        data-testid="input-stl-file"
                      />
                      <div className="flex items-center justify-center space-x-2 p-8 border-2 border-dashed border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                        <Upload className="w-6 h-6 text-primary" />
                        <div className="text-center">
                          <p className="font-medium text-foreground">
                            {stlFile ? stlFile.name : "Click to upload STL file"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Drop your files here or browse (max 50MB)
                          </p>
                        </div>
                      </div>
                    </div>
                    {stlFile && (
                      <p className="text-sm text-green-600 mt-2 flex items-center">
                        <Box className="w-4 h-4 mr-1" />
                        File selected: {(stlFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    value={formData.fileName}
                    onChange={(e) => handleInputChange("fileName", e.target.value)}
                    placeholder="Enter a name for your print job"
                    className="mt-2"
                    data-testid="input-filename"
                  />
                </div>

                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select value={formData.material} onValueChange={(value) => handleInputChange("material", value)}>
                    <SelectTrigger className="mt-2" data-testid="select-material">
                      <SelectValue placeholder="Select printing material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLA">PLA (Polylactic Acid)</SelectItem>
                      <SelectItem value="ABS">ABS (Acrylonitrile Butadiene Styrene)</SelectItem>
                      <SelectItem value="PETG">PETG (Polyethylene Terephthalate Glycol)</SelectItem>
                      <SelectItem value="TPU">TPU (Thermoplastic Polyurethane)</SelectItem>
                      <SelectItem value="Wood">Wood Filament</SelectItem>
                      <SelectItem value="Metal">Metal Filament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="estimatedWeight">Estimated Weight (grams)</Label>
                  <Input
                    id="estimatedWeight"
                    type="number"
                    value={formData.estimatedWeight}
                    onChange={(e) => handleInputChange("estimatedWeight", e.target.value)}
                    placeholder="Enter estimated weight"
                    className="mt-2"
                    data-testid="input-weight"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Special Instructions</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Any special printing instructions or requirements..."
                    className="mt-2"
                    rows={4}
                    data-testid="textarea-notes"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSubmit}
              disabled={!stlUrl || !formData.material || createJobMutation.isPending}
              className="w-full industrial-button"
              size="lg"
              data-testid="button-submit-job"
            >
              {createJobMutation.isPending ? (
                <>
                  <div className="industrial-spinner-sm text-white mr-2"></div>
                  Creating Job...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Submit Print Job
                </>
              )}
            </Button>
          </div>

          {/* 3D Viewer */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Box className="w-5 h-5" />
                  <span>3D Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg min-h-[400px] flex items-center justify-center">
                  {stlUrl ? (
                    <STLViewer stlUrl={stlUrl} />
                  ) : stlFile ? (
                    <STLViewer stlFile={stlFile} />
                  ) : (
                    <div className="text-center">
                      <Box className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Upload an STL file to see 3D preview</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Available Printers Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Printer className="w-5 h-5" />
                  <span>Available Printers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {printers.length === 0 ? (
                  <div className="text-center py-8">
                    <Printer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No printers available yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {printers.slice(0, 3).map((printer: any) => (
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
                          <p className="font-medium text-primary" data-testid={`printer-price-${printer.id}`}>
                            ${printer.pricePerGram}/g
                          </p>
                          <Badge variant="outline" data-testid={`printer-status-${printer.id}`}>
                            {printer.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {printers.length > 3 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{printers.length - 3} more printers available
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
