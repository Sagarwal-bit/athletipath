import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SportsRoadmap from "./pages/SportsRoadmap";
import Progress from "./pages/Progress";


function App() {
  return (
    <Routes>
      <Route path="/sports-roadmap" element={<SportsRoadmap />} />
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/progress" element={<Progress />} />
    </Routes>
  );
}

export default App;
