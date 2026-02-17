import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout";
import {
  Dashboard,
  Transactions,
  Accounts,
  Goals,
  Categories,
  Rules,
  Settings,
  Help,
  Import,
} from "./pages";
import {
  Design1,
  Design2,
  Design3,
  Design4,
  Design5,
  Design6,
  Design7,
  Design8,
  Design9,
  Design10,
} from "./pages/designs";

function App() {
  return (
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
          <Route path="/import" element={<Import />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
