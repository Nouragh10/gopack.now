import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Create from "@/pages/create";
import JoinTrip from "@/pages/join";
import TripHub from "@/pages/trip-hub";
import Itinerary from "@/pages/itinerary";
import Chat from "@/pages/chat";
import Packing from "@/pages/packing";
import Profile from "@/pages/profile";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/create" component={Create} />
      <Route path="/join/:tripId" component={JoinTrip} />
      <Route path="/trip/:tripId/itinerary" component={Itinerary} />
      <Route path="/trip/:tripId/chat" component={Chat} />
      <Route path="/trip/:tripId/packing" component={Packing} />
      <Route path="/trip/:tripId" component={TripHub} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
