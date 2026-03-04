import { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { calculateDistance } from "../utils/distance";
import { authFetch, getAuthUser } from "../utils/auth";

export default function Activity() {
  const role = getAuthUser()?.role;

  const [startLoc, setStartLoc] = useState(null);
  const [endLoc, setEndLoc] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [video, setVideo] = useState(null);
  const [activities, setActivities] = useState([]);

  // START ACTIVITY
  const startActivity = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setStartLoc({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      });
      setStartTime(Date.now());
      alert("Activity started");
    });
  };

  // END ACTIVITY
  const endActivity = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setEndLoc({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      });

      const timeTaken = (Date.now() - startTime) / 1000; // seconds
      setDuration(timeTaken);

      alert("Activity ended");
    });
  };

  // SUBMIT ACTIVITY
  const submitActivity = async () => {
    if (!startLoc || !endLoc || !video || !duration) {
      alert("Start, end, video required");
      return;
    }

    const distance = calculateDistance(
      startLoc.lat,
      startLoc.lon,
      endLoc.lat,
      endLoc.lon
    );

    const speed = distance / (duration / 3600); // km/h

    const formData = new FormData();
    formData.append("distance", distance);
    formData.append("duration", duration);
    formData.append("latitude", endLoc.lat);
    formData.append("longitude", endLoc.lon);
    formData.append("speed", speed);
    formData.append("video", video);

    const res = await authFetch("/api/v2/student/activity/log", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to record activity");
      return;
    }

    alert("Activity recorded successfully");
    loadActivities();
  };

  // LOAD HISTORY
  const loadActivities = useCallback(async () => {
    const res = await authFetch("/api/v2/student/activity");
    if (!res.ok) return;
    const data = await res.json();
    setActivities(data);
  }, []);

  useEffect(() => {
    if (role !== "student") return;
    loadActivities();
  }, [role, loadActivities]);

  if (role !== "student") {
    return (
      <Layout>
        <p>This page is available for students only.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">🏃 Activity Tracking</h1>

      {/* ACTION PANEL */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <button
          onClick={startActivity}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
        >
          ▶ Start Activity
        </button>

        <button
          onClick={endActivity}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          ⏹ End Activity
        </button>

        <div className="mt-4">
          <label className="block mb-2 font-medium">
            Video Proof
          </label>
          <input
            type="file"
            accept="video/*"
            capture
            onChange={(e) => setVideo(e.target.files[0])}
          />
        </div>

        <button
          onClick={submitActivity}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
        >
          Submit Activity
        </button>
      </div>

      {/* HISTORY */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="font-semibold mb-4">Recent Activities</h2>

        {activities.map((a) => (
          <div key={a.id} className="border-b py-4 text-sm">
            <p>📅 {new Date(a.created_at).toLocaleString()}</p>
            <p>📏 Distance: {Number(a.distance || 0).toFixed(2)} km</p>
            <p>⚡ Speed: {Number(a.speed || 0).toFixed(2)} km/h</p>

            {a.video_path && (
              <video
                src={a.videoAccessUrl ? `http://localhost:5000${a.videoAccessUrl}` : ""}
                controls
                className="mt-2 w-64 rounded"
              />
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
