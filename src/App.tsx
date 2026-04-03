import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppLayout, AuthGuard, GuestGuard } from "./components/layout";
import { OnboardingProvider, UserProvider } from "./context";
import { Toaster } from "./components/ui/sonner";
import { queryClient } from "./lib/query-client";
import { Dashboard } from "./pages";

// Lazy-loaded pages
const Transactions = lazy(() => import("./pages/Transactions").then(m => ({ default: m.Transactions })));
const Analytics = lazy(() => import("./pages/Analytics").then(m => ({ default: m.Analytics })));
const Import = lazy(() => import("./pages/Import").then(m => ({ default: m.Import })));
const Accounts = lazy(() => import("./pages/Accounts").then(m => ({ default: m.Accounts })));
const Goals = lazy(() => import("./pages/Goals").then(m => ({ default: m.Goals })));
const Categories = lazy(() => import("./pages/Categories").then(m => ({ default: m.Categories })));
const Rules = lazy(() => import("./pages/Rules").then(m => ({ default: m.Rules })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Help = lazy(() => import("./pages/Help").then(m => ({ default: m.Help })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-6 h-6 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <OnboardingProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                {/* Auth pages - guest only (redirect to / if logged in) */}
                <Route element={<GuestGuard />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>

                {/* Protected app routes (redirect to /login if not logged in) */}
                <Route element={<AuthGuard />}>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/import" element={<Import />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/rules" element={<Rules />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/help" element={<Help />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </OnboardingProvider>
        <Toaster position="bottom-right" />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
