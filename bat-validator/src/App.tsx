import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { FlowProvider } from "@/components/FlowContext";

// Pages
import Splash from "@/pages/Splash";
import Home from "@/pages/Home";
import Capture from "@/pages/Capture";
import Analyze from "@/pages/Analyze";
import Decision from "@/pages/Decision";
import Report from "@/pages/Report";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/home" component={Home} />
      <Route path="/capture" component={Capture} />
      <Route path="/analyze" component={Analyze} />
      <Route path="/decision" component={Decision} />
      <Route path="/reports/:id" component={Report} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FlowProvider>
        <TooltipProvider>
          {/* Main App Container - constraints to mobile size on desktop for premium app feel */}
          <div className="min-h-[100dvh] bg-zinc-900 flex justify-center selection:bg-primary/30">
            <div className="w-full max-w-md bg-background min-h-[100dvh] shadow-2xl shadow-black/50 relative overflow-hidden flex flex-col">
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </div>
          </div>
        </TooltipProvider>
      </FlowProvider>
    </QueryClientProvider>
  );
}

export default App;
