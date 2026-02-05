import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AppLayout } from "./components/layout";
import { Dashboard, Transactions } from "./pages";
import { Design1, Design2, Design3, Design4, Design5, Design6, Design7, Design8, Design9, Design10 } from "./pages/designs";

// Placeholder pages for routes we haven't built yet
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-accent-bg flex items-center justify-center">
        <span className="text-2xl">🚧</span>
      </div>
      <h1 className="heading-1 mb-2">{title}</h1>
      <p className="text-body">
        Coming soon! We're working on something awesome.
      </p>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
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
          
          {/* Main app with layout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts" element={<ComingSoon title="Accounts" />} />
            <Route
              path="/categories"
              element={<ComingSoon title="Categories" />}
            />
            <Route path="/settings" element={<ComingSoon title="Settings" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
