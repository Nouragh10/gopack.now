import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import ChooseGuide from "@/pages/choose-guide";
import WhoseTurn from "@/pages/whose-turn";
import GrownUpCheck from "@/pages/grownup-check";
import Hub from "@/pages/hub";
import VisualLearning from "@/pages/visual-learning";
import NumberLine from "@/pages/number-line";
import StepComplete from "@/pages/step-complete";
import LessonComplete from "@/pages/lesson-complete";
import Practice from "@/pages/practice";
import Progress from "@/pages/progress";
import Rewards from "@/pages/rewards";
import Profile from "@/pages/profile";
import ParentDashboard from "@/pages/parent-dashboard";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/choose-guide" component={ChooseGuide} />
      <Route path="/whose-turn" component={WhoseTurn} />
      <Route path="/grownup-check" component={GrownUpCheck} />
      <Route path="/hub" component={Hub} />
      
      <Route path="/learn/visual" component={VisualLearning} />
      <Route path="/learn/numberline" component={NumberLine} />
      <Route path="/step-complete" component={StepComplete} />
      <Route path="/lesson-complete" component={LessonComplete} />
      
      <Route path="/practice" component={Practice} />
      <Route path="/progress" component={Progress} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/profile" component={Profile} />
      
      <Route path="/parent" component={ParentDashboard} />
      
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
