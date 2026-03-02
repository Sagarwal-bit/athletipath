import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SportsRoadmap from "./pages/SportsRoadmap";
import Roadmap from "./pages/Roadmap";
import Progress from "./pages/Progress";
import Events from "./pages/Events";
import Notifications from "./pages/Notifications";
import TrustScore from "./pages/TrustScore";
import Biometric from "./pages/Biometric";
import Activity from "./pages/Activity";
import Charts from "./pages/Charts";
import {
  authFetch,
  clearAuthSession,
  getAuthToken,
  setAuthSession,
} from "./utils/auth";

function ProtectedRoute({ ready, authenticated, children }) {
  if (!ready) return <p className="p-6">Checking session...</p>;
  if (!authenticated) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ ready, authenticated, children }) {
  if (!ready) return <p className="p-6">Checking session...</p>;
  if (authenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function bootstrapSession() {
      const token = getAuthToken();
      if (!token) {
        setAuthenticated(false);
        setReady(true);
        return;
      }

      try {
        const res = await authFetch("/api/auth/me");
        if (!res.ok) {
          clearAuthSession();
          setAuthenticated(false);
          setReady(true);
          return;
        }

        const data = await res.json();
        setAuthSession({
          token,
          role: data.user.role,
          user: data.user,
        });
        setAuthenticated(true);
      } catch {
        clearAuthSession();
        setAuthenticated(false);
      } finally {
        setReady(true);
      }
    }

    bootstrapSession();
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={(
          <PublicRoute ready={ready} authenticated={authenticated}>
            <Login onLoginSuccess={() => setAuthenticated(true)} />
          </PublicRoute>
        )}
      />
      <Route
        path="/register"
        element={(
          <PublicRoute ready={ready} authenticated={authenticated}>
            <Register />
          </PublicRoute>
        )}
      />

      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <Dashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/activity"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <Activity />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/charts"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <Charts />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/trust-score"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <TrustScore />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/biometric"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <Biometric />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/roadmap"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <Roadmap />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/sports-roadmap"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <SportsRoadmap />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/progress"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <Progress />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/events"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <Events />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/notifications"
        element={(
          <ProtectedRoute ready={ready} authenticated={authenticated}>
            <Notifications />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
