import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/loading";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Upload from "@/pages/upload";
import Printers from "@/pages/printers";
import CustomerDashboard from "@/pages/customer-dashboard";
import PrinterOwnerDashboard from "@/pages/printer-owner-dashboard";
import SimulationHub from "@/pages/simulations/index";
import BiddingSimulation from "@/pages/simulations/bidding";
import JobMarketplaceSimulation from "@/pages/simulations/job-marketplace";

// Role-based route guard component - uses declarative Redirect
function RoleGuard({ children, allowedRole }: { children: React.ReactNode; allowedRole: 'customer' | 'printer_owner' }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  if (user.currentRole !== allowedRole) {
    // Redirect to the correct dashboard for user's current role
    const correctPath = user.currentRole === 'customer' ? '/customer/dashboard' : '/printer-owner/dashboard';
    return <Redirect to={correctPath} />;
  }

  return <>{children}</>;
}

// Root redirect handler - handles "/" path outside of Switch to avoid catching nested routes
function RootHandler() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  // Only handle exact root path
  if (location !== '/') {
    return null;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  // Authenticated: redirect to role-appropriate dashboard
  const defaultDashboard = user?.currentRole === 'printer_owner' 
    ? '/printer-owner/dashboard' 
    : '/customer/dashboard';
  return <Redirect to={defaultDashboard} />;
}

function Router() {
  const [location] = useLocation();

  // Handle root path separately to avoid route matching issues
  if (location === '/') {
    return <RootHandler />;
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />

      {/* Dev/Testing routes */}
      <Route path="/dev/sim" component={SimulationHub} />
      <Route path="/dev/sim/bidding" component={BiddingSimulation} />
      <Route path="/dev/sim/job-marketplace" component={JobMarketplaceSimulation} />

      {/* Customer routes */}
      <Route path="/customer/dashboard">
        <RoleGuard allowedRole="customer">
          <CustomerDashboard />
        </RoleGuard>
      </Route>
      <Route path="/customer/upload">
        <RoleGuard allowedRole="customer">
          <Upload />
        </RoleGuard>
      </Route>
      <Route path="/customer/printers">
        <RoleGuard allowedRole="customer">
          <Printers />
        </RoleGuard>
      </Route>

      {/* Printer Owner routes */}
      <Route path="/printer-owner/dashboard">
        <RoleGuard allowedRole="printer_owner">
          <PrinterOwnerDashboard />
        </RoleGuard>
      </Route>
      <Route path="/printer-owner/printers">
        <RoleGuard allowedRole="printer_owner">
          <Printers />
        </RoleGuard>
      </Route>

      {/* 404 for all other paths */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
