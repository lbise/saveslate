import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout";
import { SettingsProvider, UserProvider } from "./context";
import { Toaster } from "./components/ui/sonner";
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
// Lazy-loaded design concept pages
const Design1 = lazy(() => import("./pages/designs/Design1").then(m => ({ default: m.Design1 })));
const Design2 = lazy(() => import("./pages/designs/Design2").then(m => ({ default: m.Design2 })));
const Design3 = lazy(() => import("./pages/designs/Design3").then(m => ({ default: m.Design3 })));
const Design4 = lazy(() => import("./pages/designs/Design4").then(m => ({ default: m.Design4 })));
const Design5 = lazy(() => import("./pages/designs/Design5").then(m => ({ default: m.Design5 })));
const Design6 = lazy(() => import("./pages/designs/Design6").then(m => ({ default: m.Design6 })));
const Design7 = lazy(() => import("./pages/designs/Design7").then(m => ({ default: m.Design7 })));
const Design8 = lazy(() => import("./pages/designs/Design8").then(m => ({ default: m.Design8 })));
const Design9 = lazy(() => import("./pages/designs/Design9").then(m => ({ default: m.Design9 })));
const Design10 = lazy(() => import("./pages/designs/Design10").then(m => ({ default: m.Design10 })));

function App() {
  return (
    <SettingsProvider>
      <UserProvider>
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              {/* Design Concepts - standalone pages */}
              <Route path="/1" element={<Design1 />} />
              <Route path="/2" element={<Design2 />} />
              <Route path="/3" element={<Design3 />} />
              <Route path="/4" element={<Design4 />} />
              <Route path="/5" element={<Design5 />} />
              <Route path="/6" element={<Design6 />} />
              <Route path="/7" element={<Design7 />} />
              <Route path="/8" element={<Design8 />} />
              <Route path="/9" element={<Design9 />} />
              <Route path="/10" element={<Design10 />} />

              {/* Auth pages without app shell */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Main app with layout */}
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
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </UserProvider>
    </SettingsProvider>
  );
}

export default App;
