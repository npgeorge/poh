import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Box, Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Mock data for testing
const MOCK_JOB = {
  id: 999,
  fileName: "demo-part.stl",
  material: "PLA",
  status: "pending",
  paymentStatus: "paid",
  estimatedCost: "25.00",
  createdAt: new Date().toISOString(),
};

const MOCK_BIDS = [
  {
    id: 1,
    amount: "18.75",
    estimatedCompletionDays: 5,
    notes: "Best price guaranteed! I have PLA in stock and ready to print.",
    printer: {
      id: 101,
      name: "Budget Builds 3D",
      location: "Austin, TX",
      rating: "4.5",
      completedJobs: 89,
      materials: ["PLA", "TPU"],
    },
  },
  {
    id: 2,
    amount: "21.25",
    estimatedCompletionDays: 7,
    notes: "Reliable service with great prices. Central location for fast shipping.",
    printer: {
      id: 102,
      name: "Midwest Makers Hub",
      location: "Chicago, IL",
      rating: "4.6",
      completedJobs: 63,
      materials: ["PLA", "PETG", "ABS"],
    },
  },
  {
    id: 3,
    amount: "22.50",
    estimatedCompletionDays: 3,
    notes: "Fast turnaround, premium quality prints. I specialize in quick delivery.",
    printer: {
      id: 103,
      name: "SpeedPrint Pro",
      location: "San Francisco, CA",
      rating: "4.8",
      completedJobs: 47,
      materials: ["PLA", "PETG", "ABS"],
    },
  },
];

export default function BidSimulationPage() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleAcceptBid = (bidId: number, printerName: string, amount: string) => {
    toast({
      title: "Bid Accepted (Demo)",
      description: `You accepted the bid from ${printerName} for $${amount}`,
    });
    console.log("Accepted bid:", bidId);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b-2 border-black dark:border-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">
                Bidding System Demo
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test the competitive bidding UI without setting up jobs
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="border-2 border-black dark:border-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
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
                <strong>This is a demo page</strong> to test the bidding UI without setting up the full workflow.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                In the real app, this is how customers view and accept bids after uploading a job and receiving bids from printer owners.
              </p>
              <ol className="list-decimal list-inside space-y-1 mt-4 text-gray-700 dark:text-gray-300">
                <li>Click the chevron (▼) button to expand the job details</li>
                <li>View the top 3 competitive bids sorted by best value</li>
                <li>See printer details, ratings, and notes</li>
                <li>Click "Accept Bid" to test the acceptance flow (demo only)</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Mock Job Card with Bidding */}
        <Card className="border-2 border-black dark:border-white">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Demo Job</CardTitle>
          </CardHeader>
          <CardContent>
            <Collapsible
              open={isExpanded}
              onOpenChange={setIsExpanded}
              className="border-2 border-gray-200 dark:border-gray-800"
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Box className="w-6 h-6 text-orange-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-black dark:text-white">
                        {MOCK_JOB.fileName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(MOCK_JOB.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Payment: {MOCK_JOB.paymentStatus} • Estimated: ${MOCK_JOB.estimatedCost}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>

                    <Badge className="bg-yellow-500 text-white border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </div>

                <CollapsibleContent className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-black dark:text-white mb-3">
                      Competitive Bids (Showing Best 3)
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                      Sorted by best price and fastest delivery
                    </p>

                    <div className="space-y-3">
                      {MOCK_BIDS.map((bid, index) => (
                        <MockBidCard
                          key={bid.id}
                          bid={bid}
                          rank={index + 1}
                          onAccept={() =>
                            handleAcceptBid(bid.id, bid.printer.name, bid.amount)
                          }
                        />
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="border-2 border-gray-200 dark:border-gray-800 mt-8">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">🔧 Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-black dark:text-white">Bidding Logic:</p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 ml-4">
                  <li>Max 5 bids per job (only top 3 shown to customers)</li>
                  <li>Sorted by: Price (ascending) → Delivery time (ascending)</li>
                  <li>Best value bid gets highlighted badge</li>
                  <li>Accepting one bid auto-rejects all others</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-black dark:text-white mt-4">
                  Components Used:
                </p>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 ml-4">
                  <li>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                      BidsList.tsx
                    </code>{" "}
                    - Top 3 bids display
                  </li>
                  <li>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                      Collapsible
                    </code>{" "}
                    - Expandable job card
                  </li>
                  <li>Real data comes from: <code className="text-xs">GET /api/jobs/:id/bids</code></li>
                  <li>Accept action calls: <code className="text-xs">PUT /api/bids/:id/accept</code></li>
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-gray-600 dark:text-gray-400">
                  To test with real data, see{" "}
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                    DEV_TESTING_GUIDE.md
                  </code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface MockBidCardProps {
  bid: typeof MOCK_BIDS[0];
  rank: number;
  onAccept: () => void;
}

function MockBidCard({ bid, rank, onAccept }: MockBidCardProps) {
  const isBestValue = rank === 1;

  return (
    <Card
      className={`border-2 ${
        isBestValue
          ? "border-orange-500"
          : "border-gray-200 dark:border-gray-800"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-black dark:text-white">
                {bid.printer.name}
              </h3>
              {isBestValue && (
                <Badge className="bg-orange-500 text-white border-0 text-xs">
                  Best Value
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>📍 {bid.printer.location}</span>
              <span>⭐ {bid.printer.rating}</span>
              <span>💼 {bid.printer.completedJobs} jobs</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💵</span>
            <div>
              <div className="text-lg font-bold text-black dark:text-white">
                ${parseFloat(bid.amount).toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Total Price
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-lg font-bold text-black dark:text-white">
                {bid.estimatedCompletionDays} days
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Delivery Time
              </div>
            </div>
          </div>
        </div>

        {bid.notes && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">
              "{bid.notes}"
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-800">
          <Box className="h-3.5 w-3.5" />
          <span>Materials: {bid.printer.materials.join(", ")}</span>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={onAccept}
            className="bg-orange-500 hover:bg-orange-600 text-white border-0"
            size="sm"
          >
            Accept Bid
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
