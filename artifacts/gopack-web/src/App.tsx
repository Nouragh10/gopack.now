import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { handleGoogleRedirectResult } from "@/lib/firebase";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Explore from "@/pages/explore";
import Create from "@/pages/create";
import JoinTrip from "@/pages/join";
import TripHub from "@/pages/trip-hub";
import Itinerary from "@/pages/itinerary";
import Chat from "@/pages/chat";
import Packing from "@/pages/packing";
import Profile from "@/pages/profile";

const queryClient = new QueryClient();

// Handles the Google redirect result on any page — Firebase can redirect back
// to any URL (not just /login), so we must call getRedirectResult globally.
function GoogleAuthHandler() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    handleGoogleRedirectResult()
      .then((result) => {
        if (result?.user) {
          const dest = sessionStorage.getItem("gopack_auth_redirect") || "/dashboard";
          sessionStorage.removeItem("gopack_auth_redirect");
          setLocation(dest);
        }
      })
      .catch((err) => {
        // auth/no-auth-event is the normal case when there's no pending redirect
        if (err?.code !== "auth/no-auth-event") {
          console.error("Google redirect auth error:", err);
        }
      });
  }, []);

  return null;
}

function Router() {
  return (
    <>
      <GoogleAuthHandler />
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/explore" component={Explore} />
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
    </>
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
