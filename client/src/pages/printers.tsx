import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, 
  Plus, 
  ArrowLeft, 
  MapPin, 
  DollarSign,
  Star,
  Settings,
  Search,
  Filter,
  X
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const MATERIALS = [
  { id: "PLA", name: "PLA (Polylactic Acid)", description: "Easy to print, biodegradable" },
  { id: "ABS", name: "ABS (Acrylonitrile Butadiene Styrene)", description: "Strong, heat resistant" },
  { id: "PETG", name: "PETG (Polyethylene Terephthalate Glycol)", description: "Chemical resistant, clear" },
  { id: "TPU", name: "TPU (Thermoplastic Polyurethane)", description: "Flexible, rubber-like" },
  { id: "Wood", name: "Wood Filament", description: "Wood-filled composite" },
  { id: "Metal", name: "Metal Filament", description: "Metal-filled composite" },
];

export default function PrintersPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    pricePerGram: "",
    materials: [] as string[]
  });

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    materials: [] as string[],
    location: "",
    priceRange: [0, 1] as [number, number],
    status: "available"
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

  const { data: myPrinters = [], isLoading: printersLoading } = useQuery({
    queryKey: ["/api/printers/my"],
    enabled: !!user,
  });

  // Debounced search query
  const searchQuery = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.materials.length > 0) {
      params.set('materials', filters.materials.join(','));
    }
    if (filters.location.trim()) {
      params.set('location', filters.location.trim());
    }
    if (filters.priceRange[0] > 0) {
      params.set('minPrice', filters.priceRange[0].toString());
    }
    if (filters.priceRange[1] < 1) {
      params.set('maxPrice', filters.priceRange[1].toString());
    }
    if (filters.status) {
      params.set('status', filters.status);
    }
    
    return params.toString() ? `?${params.toString()}` : '';
  }, [filters]);

  const { data: allPrinters = [], isLoading: searchLoading } = useQuery({
    queryKey: ["/api/printers/search", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/printers/search${searchQuery}`);
      if (!response.ok) throw new Error('Failed to search printers');
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000, // Consider data stale after 1 second for real-time feel
  });

  const createPrinterMutation = useMutation({
    mutationFn: async (printerData: any) => {
      const response = await apiRequest("POST", "/api/printers", printerData);
      return response.json();
    },
    onSuccess: (newPrinter) => {
      toast({
        title: "Printer Registered",
        description: `${newPrinter.name} has been successfully registered.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        location: "",
        description: "",
        pricePerGram: "",
        materials: []
      });
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
        description: "Failed to register printer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.pricePerGram || formData.materials.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const printerData = {
      name: formData.name,
      location: formData.location,
      description: formData.description,
      pricePerGram: parseFloat(formData.pricePerGram),
      materials: formData.materials,
      status: "available"
    };

    createPrinterMutation.mutate(printerData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMaterialToggle = (materialId: string) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.includes(materialId)
        ? prev.materials.filter(m => m !== materialId)
        : [...prev.materials, materialId]
    }));
  };

  // Filter management functions
  const handleFilterMaterialToggle = (materialId: string) => {
    setFilters(prev => ({
      ...prev,
      materials: prev.materials.includes(materialId)
        ? prev.materials.filter(m => m !== materialId)
        : [...prev.materials, materialId]
    }));
  };

  const handleLocationFilter = (location: string) => {
    setFilters(prev => ({ ...prev, location }));
  };

  const handlePriceRangeFilter = (range: [number, number]) => {
    setFilters(prev => ({ ...prev, priceRange: range }));
  };

  const clearFilters = () => {
    setFilters({
      materials: [],
      location: "",
      priceRange: [0, 1],
      status: "available"
    });
  };

  const hasActiveFilters = filters.materials.length > 0 || 
    filters.location.trim() || 
    filters.priceRange[0] > 0 || 
    filters.priceRange[1] < 1;

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
              <Button asChild variant="ghost" size="sm">
                <Link href="/" data-testid="link-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">3D Printers</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-add-printer">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Printer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Register New Printer</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Printer Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="e.g., Prusa i3 MK3S+"
                          className="mt-2"
                          data-testid="input-printer-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => handleInputChange("location", e.target.value)}
                          placeholder="e.g., San Francisco, CA"
                          className="mt-2"
                          data-testid="input-printer-location"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="pricePerGram">Price per Gram (USD) *</Label>
                      <Input
                        id="pricePerGram"
                        type="number"
                        step="0.01"
                        value={formData.pricePerGram}
                        onChange={(e) => handleInputChange("pricePerGram", e.target.value)}
                        placeholder="0.05"
                        className="mt-2"
                        data-testid="input-price-per-gram"
                      />
                    </div>

                    <div>
                      <Label>Supported Materials *</Label>
                      <div className="grid md:grid-cols-2 gap-4 mt-2">
                        {MATERIALS.map((material) => (
                          <div key={material.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                            <Checkbox
                              id={material.id}
                              checked={formData.materials.includes(material.id)}
                              onCheckedChange={() => handleMaterialToggle(material.id)}
                              data-testid={`checkbox-material-${material.id}`}
                            />
                            <div className="flex-1">
                              <Label htmlFor={material.id} className="font-medium cursor-pointer">
                                {material.name}
                              </Label>
                              <p className="text-sm text-muted-foreground">{material.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        placeholder="Describe your printer capabilities, print volume, special features..."
                        className="mt-2"
                        rows={3}
                        data-testid="textarea-printer-description"
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createPrinterMutation.isPending}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        data-testid="button-submit-printer"
                      >
                        {createPrinterMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Registering...
                          </>
                        ) : (
                          "Register Printer"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Badge variant="secondary">
                {user?.firstName || user?.email}
              </Badge>
              <Button
                onClick={handleLogout}
                variant="outline"
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* My Printers Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">My Printers</h2>
            <Badge variant="outline" data-testid="my-printers-count">
              {myPrinters.length} registered
            </Badge>
          </div>

          {printersLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          ) : myPrinters.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Printer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Printers Registered</h3>
                <p className="text-muted-foreground mb-6">
                  Register your first 3D printer to start earning Bitcoin from print jobs.
                </p>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Register Your First Printer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPrinters.map((printer: any) => (
                <Card key={printer.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-accent/10 text-accent rounded-lg flex items-center justify-center">
                          <Printer className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold" data-testid={`my-printer-name-${printer.id}`}>
                            {printer.name}
                          </h3>
                          <Badge 
                            variant={printer.status === 'available' ? 'default' : 'secondary'}
                            data-testid={`my-printer-status-${printer.id}`}
                          >
                            {printer.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span data-testid={`my-printer-location-${printer.id}`}>{printer.location}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span data-testid={`my-printer-price-${printer.id}`}>${printer.pricePerGram}/gram</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Star className="w-4 h-4 mr-2" />
                        <span data-testid={`my-printer-rating-${printer.id}`}>
                          {printer.rating ? `${printer.rating}/5.0` : 'No ratings yet'}
                        </span>
                      </div>
                    </div>

                    {printer.description && (
                      <p className="text-sm text-muted-foreground mt-4" data-testid={`my-printer-description-${printer.id}`}>
                        {printer.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-4">
                      {Array.isArray(printer.materials) && printer.materials.map((material: string) => (
                        <Badge key={material} variant="outline" className="text-xs">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* All Printers Section with Filters */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">All Available Printers</h2>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {hasActiveFilters && <Badge className="ml-2">Active</Badge>}
              </Button>
              <Badge variant="outline" data-testid="all-printers-count">
                {allPrinters.length} available
              </Badge>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Search className="w-5 h-5 mr-2" />
                    Search & Filter Printers
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                      <X className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Location Search */}
                <div>
                  <Label htmlFor="location-search">Location</Label>
                  <Input
                    id="location-search"
                    placeholder="Search by city, state, or country..."
                    value={filters.location}
                    onChange={(e) => handleLocationFilter(e.target.value)}
                    className="mt-2"
                    data-testid="input-location-filter"
                  />
                </div>

                {/* Material Filters */}
                <div>
                  <Label>Supported Materials</Label>
                  <div className="grid md:grid-cols-3 gap-4 mt-2">
                    {MATERIALS.map((material) => (
                      <div key={material.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                        <Checkbox
                          id={`filter-${material.id}`}
                          checked={filters.materials.includes(material.id)}
                          onCheckedChange={() => handleFilterMaterialToggle(material.id)}
                          data-testid={`checkbox-filter-${material.id}`}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`filter-${material.id}`} className="font-medium cursor-pointer text-sm">
                            {material.name}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <Label>Price Range (USD per gram)</Label>
                  <div className="mt-4 space-y-4">
                    <Slider
                      value={filters.priceRange}
                      onValueChange={handlePriceRangeFilter}
                      max={1}
                      min={0}
                      step={0.01}
                      className="w-full"
                      data-testid="slider-price-range"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>${filters.priceRange[0].toFixed(2)}</span>
                      <span>${filters.priceRange[1].toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {searchLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {allPrinters.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Printer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Printers Available</h3>
                <p className="text-muted-foreground">
                  Be the first to register a printer in the network!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPrinters.map((printer: any) => (
                <Card key={printer.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                          <Printer className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold" data-testid={`printer-name-${printer.id}`}>
                            {printer.name}
                          </h3>
                          <Badge 
                            variant={printer.status === 'available' ? 'default' : 'secondary'}
                            data-testid={`printer-status-${printer.id}`}
                          >
                            {printer.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span data-testid={`printer-location-${printer.id}`}>{printer.location}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span data-testid={`printer-price-${printer.id}`}>${printer.pricePerGram}/gram</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Star className="w-4 h-4 mr-2" />
                        <span data-testid={`printer-rating-${printer.id}`}>
                          {printer.rating ? `${printer.rating}/5.0 (${printer.completedJobs} jobs)` : 'New printer'}
                        </span>
                      </div>
                    </div>

                    {printer.description && (
                      <p className="text-sm text-muted-foreground mt-4" data-testid={`printer-description-${printer.id}`}>
                        {printer.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-4">
                      {Array.isArray(printer.materials) && printer.materials.map((material: string) => (
                        <Badge key={material} variant="outline" className="text-xs">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
