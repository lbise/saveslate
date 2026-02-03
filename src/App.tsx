import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AppLayout } from "./components/layout";
import { Dashboard, Transactions } from "./pages";

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
