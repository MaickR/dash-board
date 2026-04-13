import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import OfflineIndicator from "./components/OfflineIndicator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/kanban" component={Home} />
      <Route path="/reuniones" component={Home} />
      <Route path="/archivos" component={Home} />
      <Route path="/departamentos" component={Home} />
      <Route path="/responsables" component={Home} />
      <Route path="/correos" component={Home} />
      <Route path="/cumplimiento" component={Home} />
      <Route path="/gantt" component={Home} />
      <Route path="/resumen" component={Home} />
      <Route path="/automatizaciones" component={Home} />
      <Route path="/plantillas" component={Home} />
      <Route path="/plantillas-prompt" component={Home} />
      <Route path="/carga" component={Home} />
      <Route path="/tareas" component={Home} />
      <Route path="/informes" component={Home} />
      <Route path="/drive" component={Home} />
      <Route path="/actividad" component={Home} />
      <Route path="/calendario" component={Home} />
      <Route path="/organizacion" component={Home} />
      <Route path="/configuracion" component={Home} />
      <Route path="/config-brief" component={Home} />
      <Route path="/reunion/:id" component={Home} />
      <Route path="/confirm/:tareaId/:action" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <OfflineIndicator />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
