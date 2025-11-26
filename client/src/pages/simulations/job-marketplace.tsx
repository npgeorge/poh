import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft,
  Package,
  MapPin,
  DollarSign,
  Calendar,
  Filter,
  X,
} from "lucide-react";

// Mock job data
const MOCK_JOBS = [
  {
    id: 1,
    fileName: "mechanical-bracket.stl",
    material: "PLA",
    estimatedCost: "15.00",
    quantity: 1,
    location: "San Jose, CA",
    distance: 45,
    customerName: "TechStart Inc",
    customerRating: "4.8",
    uploadedDays: 2,
    notes: "Needs to be durable for mechanical use. Prefer black color.",
  },
  {
    id: 2,
    fileName: "miniature-set-5pc.stl",
    material: "Resin",
    estimatedCost: "35.00",
    quantity: 5,
    location: "Boston, MA",
    distance: 2800,
    customerName: "GameCraft Studios",
    customerRating: "4.9",
    uploadedDays: 1,
    notes: "High detail required. These are for display models.",
  },
  {
    id: 3,
    fileName: "prototype-housing.stl",
    material: "ABS",
    estimatedCost: "45.00",
    quantity: 2,
    location: "Seattle, WA",
    distance: 800,
    customerName: "InnovateCorp",
    customerRating: "4.6",
    uploadedDays: 3,
    notes: "Need heat resistance. Will be used for electronics enclosure.",
  },
  {
    id: 4,
    fileName: "custom-bracket-small.stl",
    material: "PETG",
    estimatedCost: "12.00",
    quantity: 1,
    location: "Denver, CO",
    distance: 1200,
    customerName: "MakerSpace Denver",
    customerRating: "4.7",
    uploadedDays: 1,
    notes: "Simple part, standard PETG is fine.",
  },
  {
    id: 5,
    fileName: "game-pieces-set.stl",
    material: "PLA",
    estimatedCost: "28.00",
    quantity: 10,
    location: "Austin, TX",
    distance: 1600,
    customerName: "BoardGame Bros",
    customerRating: "4.5",
    uploadedDays: 4,
    notes: "Multiple colors needed - I'll provide details after acceptance.",
  },
  {
    id: 6,
    fileName: "replacement-gear.stl",
    material: "Nylon",
    estimatedCost: "55.00",
    quantity: 1,
    location: "New York, NY",
    distance: 2900,
    customerName: "Industrial Repair Co",
    customerRating: "4.9",
    uploadedDays: 1,
    notes: "Needs to be strong and wear-resistant. Critical replacement part.",
  },
  {
    id: 7,
    fileName: "architectural-model.stl",
    material: "PLA",
    estimatedCost: "65.00",
    quantity: 1,
    location: "Los Angeles, CA",
    distance: 350,
    customerName: "ArchViz Studio",
    customerRating: "4.8",
    uploadedDays: 2,
    notes: "White PLA preferred. This is for a client presentation.",
  },
  {
    id: 8,
    fileName: "phone-stands-3x.stl",
    material: "TPU",
    estimatedCost: "18.00",
    quantity: 3,
    location: "Chicago, IL",
    distance: 1800,
    customerName: "GadgetHub",
    customerRating: "4.4",
    uploadedDays: 5,
    notes: "Flexible material needed. Any color is fine.",
  },
  {
    id: 9,
    fileName: "tool-organizer.stl",
    material: "PETG",
    estimatedCost: "22.00",
    quantity: 2,
    location: "Miami, FL",
    distance: 2400,
    customerName: "Workshop Tools Inc",
    customerRating: "4.7",
    uploadedDays: 3,
    notes: "Needs to handle some weight. Orange or yellow preferred.",
  },
  {
    id: 10,
    fileName: "drone-parts-set.stl",
    material: "Carbon Fiber",
    estimatedCost: "95.00",
    quantity: 4,
    location: "Phoenix, AZ",
    distance: 400,
    customerName: "AeroTech Labs",
    customerRating: "4.9",
    uploadedDays: 1,
    notes: "Lightweight and strong. Very tight tolerances required.",
  },
  {
    id: 11,
    fileName: "art-sculpture.stl",
    material: "Wood Filament",
    estimatedCost: "75.00",
    quantity: 1,
    location: "Portland, OR",
    distance: 650,
    customerName: "Creative Arts Collective",
    customerRating: "4.6",
    uploadedDays: 4,
    notes: "This is an art piece. Natural wood finish preferred.",
  },
  {
    id: 12,
    fileName: "functional-gears.stl",
    material: "Nylon",
    estimatedCost: "42.00",
    quantity: 1,
    location: "Atlanta, GA",
    distance: 2200,
    customerName: "Precision Mechanics",
    customerRating: "4.8",
    uploadedDays: 2,
    notes: "Must be precise. These gears need to mesh perfectly.",
  },
];

const MATERIALS = ["All", "PLA", "ABS", "PETG", "TPU", "Nylon", "Resin", "Carbon Fiber", "Wood Filament"];

export default function JobMarketplaceSimulation() {
  const { toast } = useToast();
  const [materialFilter, setMaterialFilter] = useState("All");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  // Filter jobs
  let filteredJobs = MOCK_JOBS;

  if (materialFilter !== "All") {
    filteredJobs = filteredJobs.filter((job) => job.material === materialFilter);
  }

  if (maxPrice) {
    filteredJobs = filteredJobs.filter((job) => parseFloat(job.estimatedCost) <= parseFloat(maxPrice));
  }

  if (maxDistance) {
    filteredJobs = filteredJobs.filter((job) => job.distance <= parseInt(maxDistance));
  }

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return a.uploadedDays - b.uploadedDays;
      case "price-high":
        return parseFloat(b.estimatedCost) - parseFloat(a.estimatedCost);
      case "price-low":
        return parseFloat(a.estimatedCost) - parseFloat(b.estimatedCost);
      case "distance":
        return a.distance - b.distance;
      default:
        return 0;
    }
  });

  const handleClearFilters = () => {
    setMaterialFilter("All");
    setMaxPrice("");
    setMaxDistance("");
    setSortBy("recent");
  };

  const hasActiveFilters = materialFilter !== "All" || maxPrice || maxDistance;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b-2 border-black dark:border-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">
                Job Marketplace Demo
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Printer owner view of browsing and bidding on jobs
              </p>
            </div>
            <Link href="/dev/sim">
              <Button variant="outline" className="border-2 border-black dark:border-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Hub
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Instructions */}
        <Card className="border-2 border-blue-500 mb-8">
          <CardHeader>
            <CardTitle className="text-blue-600">ℹ️ How This Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>This is a demo</strong> of the printer owner experience browsing available jobs.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                In the real app, these jobs would come from customers who have uploaded STL files and paid for their orders.
              </p>
              <ol className="list-decimal list-inside space-y-1 mt-4 text-gray-700 dark:text-gray-300">
                <li>Use filters to find jobs matching your capabilities (material, price, distance)</li>
                <li>Sort by recent uploads, price, or distance</li>
                <li>Review job details including customer notes and requirements</li>
                <li>Click "Submit Bid" to test the bidding flow (demo mode)</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Controls */}
        <Card className="border-2 border-black dark:border-white mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-black dark:text-white flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter & Sort
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-gray-600 dark:text-gray-400"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Material</Label>
                <Select value={materialFilter} onValueChange={setMaterialFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map((mat) => (
                      <SelectItem key={mat} value={mat}>
                        {mat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max Price ($)</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Max Distance (mi)</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="distance">Distance: Near to Far</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Showing <strong>{sortedJobs.length}</strong> of <strong>{MOCK_JOBS.length}</strong> jobs
              </span>
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {materialFilter !== "All" && (
                    <Badge variant="secondary">{materialFilter}</Badge>
                  )}
                  {maxPrice && (
                    <Badge variant="secondary">≤ ${maxPrice}</Badge>
                  )}
                  {maxDistance && (
                    <Badge variant="secondary">≤ {maxDistance} mi</Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Jobs Grid */}
        {sortedJobs.length === 0 ? (
          <Card className="border-2 border-gray-200 dark:border-gray-800">
            <CardContent className="pt-8 pb-8 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                No jobs match your filters. Try adjusting your criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface JobCardProps {
  job: typeof MOCK_JOBS[0];
}

function JobCard({ job }: JobCardProps) {
  const { toast } = useToast();

  const handleSubmitBid = () => {
    toast({
      title: "Bid Submitted (Demo)",
      description: `Your bid for "${job.fileName}" would be submitted here`,
    });
  };

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-orange-500 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="text-base text-black dark:text-white">
            {job.fileName}
          </CardTitle>
          <Badge className="bg-orange-500 text-white border-0 text-xs">
            {job.material}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2 text-xs">
          <Calendar className="w-3 h-3" />
          Posted {job.uploadedDays} {job.uploadedDays === 1 ? "day" : "days"} ago
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-lg font-bold text-black dark:text-white">
                ${parseFloat(job.estimatedCost).toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Estimated
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-black dark:text-white">
                {job.quantity}x
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Quantity
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
            <MapPin className="w-3 h-3" />
            <span>{job.location}</span>
            <span className="text-gray-400">•</span>
            <span>{job.distance} mi away</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Customer:</span>
            <span className="font-medium text-black dark:text-white">
              {job.customerName}
            </span>
            <span className="text-yellow-600">⭐ {job.customerRating}</span>
          </div>
        </div>

        {job.notes && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
              "{job.notes}"
            </p>
          </div>
        )}

        <Button
          onClick={handleSubmitBid}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0"
          size="sm"
        >
          Submit Bid
        </Button>
      </CardContent>
    </Card>
  );
}
