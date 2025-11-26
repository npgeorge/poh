import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowLeft,
  DollarSign,
  Search,
  Briefcase,
  Bell,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

const SIMULATIONS = [
  {
    id: "bidding",
    title: "Competitive Bidding",
    description: "Test the customer experience of reviewing and accepting bids from multiple printers",
    icon: DollarSign,
    status: "complete" as const,
    path: "/dev/sim/bidding",
    features: [
      "Expandable job card with top 3 bids",
      "Best value highlighting",
      "Printer details and ratings",
      "One-click bid acceptance"
    ],
    difficulty: "Easy",
    setupTime: "0 minutes"
  },
  {
    id: "printer-discovery",
    title: "Printer Discovery",
    description: "Browse and filter through 15+ printers with various capabilities and pricing",
    icon: Search,
    status: "planned" as const,
    path: "/dev/sim/printer-discovery",
    features: [
      "Filter by location, material, price",
      "Sort by rating, price, distance",
      "Detailed printer specifications",
      "Real-time search and filtering"
    ],
    difficulty: "Medium",
    setupTime: "0 minutes"
  },
  {
    id: "job-marketplace",
    title: "Job Marketplace",
    description: "Experience the printer owner view of browsing jobs and submitting bids",
    icon: Briefcase,
    status: "complete" as const,
    path: "/dev/sim/job-marketplace",
    features: [
      "12 open jobs with varying requirements",
      "Filter by material, price, location",
      "Sort by recent, price, distance",
      "Job details with customer info"
    ],
    difficulty: "Medium",
    setupTime: "0 minutes"
  },
  {
    id: "notifications",
    title: "Notification Center",
    description: "View all notification types and states without triggering real events",
    icon: Bell,
    status: "future" as const,
    path: "/dev/sim/notifications",
    features: [
      "Various notification types",
      "Read/unread states",
      "Time-based grouping",
      "Action buttons and navigation"
    ],
    difficulty: "Easy",
    setupTime: "0 minutes"
  }
];

export default function SimulationHub() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b-2 border-black dark:border-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">
                Feature Simulations
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Interactive demos for UX testing without network effects
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
        {/* Info Card */}
        <Card className="border-2 border-blue-500 mb-8">
          <CardHeader>
            <CardTitle className="text-blue-600">ℹ️ About Simulations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>These are interactive demos</strong> designed to test features that normally require
                multiple users, network effects, or complex setup.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <p className="font-semibold text-black dark:text-white">✅ Benefits:</p>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                    <li>No authentication required</li>
                    <li>No database setup needed</li>
                    <li>Instant access to test UX</li>
                    <li>Perfect for stakeholder demos</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-black dark:text-white">🎯 Use Cases:</p>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                    <li>UX testing and iteration</li>
                    <li>QA with consistent data</li>
                    <li>Investor presentations</li>
                    <li>Design review sessions</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simulations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SIMULATIONS.map((sim) => (
            <SimulationCard key={sim.id} simulation={sim} />
          ))}
        </div>

        {/* Technical Info */}
        <Card className="border-2 border-gray-200 dark:border-gray-800 mt-8">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">🔧 For Developers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                All simulations use the same UI components as production, just with mock data.
                This ensures design consistency and allows for rapid UX iteration.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="font-semibold text-black dark:text-white mb-2">Location:</p>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    client/src/pages/simulations/
                  </code>
                </div>
                <div>
                  <p className="font-semibold text-black dark:text-white mb-2">Access:</p>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    http://localhost:3000/dev/sim/*
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface SimulationCardProps {
  simulation: typeof SIMULATIONS[0];
}

function SimulationCard({ simulation }: SimulationCardProps) {
  const Icon = simulation.icon;

  const statusConfig = {
    complete: {
      icon: CheckCircle,
      color: "bg-green-500",
      text: "Available",
      textColor: "text-green-700 dark:text-green-300"
    },
    planned: {
      icon: Clock,
      color: "bg-yellow-500",
      text: "Coming Soon",
      textColor: "text-yellow-700 dark:text-yellow-300"
    },
    future: {
      icon: AlertCircle,
      color: "bg-gray-500",
      text: "Future",
      textColor: "text-gray-700 dark:text-gray-300"
    }
  };

  const status = statusConfig[simulation.status];
  const StatusIcon = status.icon;
  const isComplete = simulation.status === "complete";

  return (
    <Card className={`border-2 ${isComplete ? 'border-black dark:border-white' : 'border-gray-300 dark:border-gray-700'}`}>
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isComplete ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <Icon className={`w-6 h-6 ${isComplete ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
            </div>
            <div>
              <CardTitle className="text-black dark:text-white">
                {simulation.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon className={`w-3 h-3 ${status.textColor}`} />
                <span className={`text-xs font-medium ${status.textColor}`}>
                  {status.text}
                </span>
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          {simulation.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-black dark:text-white mb-2">Features:</p>
          <ul className="space-y-1">
            {simulation.features.map((feature, index) => (
              <li key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-orange-500">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Badge variant="outline" className="border-gray-300 dark:border-gray-700">
            {simulation.difficulty}
          </Badge>
          <span className="text-gray-600 dark:text-gray-400">
            Setup: {simulation.setupTime}
          </span>
        </div>

        {isComplete ? (
          <Link href={simulation.path}>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white border-0">
              Launch Simulation
            </Button>
          </Link>
        ) : (
          <Button
            disabled
            className="w-full opacity-50 cursor-not-allowed"
          >
            {simulation.status === "planned" ? "Coming Soon" : "Future Release"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
