
import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Workbook from "./pages/Workbook";
import CreateEngagement from "./pages/CreateWorkbook";
import DataIngestionWorkspace from "./pages/DataIngestionWorkspace";
import RiskIntelligenceDashboard from "./pages/RiskIntelligenceDashboard";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Onboarding,
    ErrorBoundary: NotFound,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    ),
  },
  {
    path: "/workbook/:id",
    element: (
      <ProtectedRoute>
        <Workbook />
      </ProtectedRoute>
    ),
  },
  {
    path: "/create-workbook",
    element: (
      <ProtectedRoute>
        <CreateEngagement />
      </ProtectedRoute>
    ),
  },
  {
    path: "/data-ingestion",
    element: (
      <ProtectedRoute>
        <DataIngestionWorkspace />
      </ProtectedRoute>
    ),
  },
  {
    path: "/risk-intelligence",
    element: (
      <ProtectedRoute>
        <RiskIntelligenceDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    Component: NotFound,
  },
]);


