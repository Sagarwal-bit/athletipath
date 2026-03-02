import { Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <Routes>
      <Route path="/activity" element={<Activity />} />
      <Route path="/charts" element={<Charts />} />
      <Route path="/trust-score" element={<TrustScore />} />
      <Route path="/biometric" element={<Biometric />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/sports-roadmap" element={<SportsRoadmap />} />
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/events" element={<Events />} />
      <Route path="/notifications" element={<Notifications />} />
    </Routes>
  );
}

export default App;
