import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SportsRoadmap from "./pages/SportsRoadmap";
import Progress from "./pages/Progress";
import Events from "./pages/Events";
import Notifications from "./pages/Notifications";
import TrustScore from "./pages/TrustScore";
import Biometric from "./pages/Biometric";
function App() {
  return (
    <Routes>
        
      <Route path="/trust-score" element={<TrustScore />} />
      <Route path="/biometric" element={<Biometric />} />
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
