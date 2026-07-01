import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { SensorDataProvider } from "@/lib/SensorDataContext";
import PageNotFound from "./lib/PageNotFound";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import MapPage from "./pages/MapPage";
import Sensors from "./pages/Sensors";
import Alerts from "./pages/Alerts";
import Navigate from "./pages/Navigate";

function App() {
  return (
    <SensorDataProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/sensors" element={<Sensors />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/navigate" element={<Navigate />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </SensorDataProvider>
  );
}

export default App;
