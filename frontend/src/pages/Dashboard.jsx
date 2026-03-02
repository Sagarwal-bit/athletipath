import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        const res = await fetch(
          "http://localhost:5000/api/dashboard/summary/1",
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      }
    }

    fetchDashboard();
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <Layout>
        <p className="text-red-600">Error: {error}</p>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <p>Loading dashboard...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card title="Activities" value={data.activities} />
        <Card title="Distance" value={`${Number(data.distance).toFixed(2)} km`} />
        <Card title="Trust Score" value={data.trust} />
        <Card title="Upcoming Events" value={data.events} />
      </div>

      {/* ===== NEXT ACTION ===== */}
      <div className="bg-blue-50 p-6 rounded shadow mb-6">
        <h2 className="text-lg font-semibold mb-2">🎯 Next Recommended Action</h2>
        <p className="text-gray-700">
          Based on your recent activity and trust score, focus on improving
          sprint endurance and register for upcoming district-level events.
        </p>
      </div>

      {/* ===== UPCOMING EVENTS ===== */}
      <div className="bg-white p-5 rounded shadow mb-6">
        <h3 className="font-semibold mb-3">📅 Upcoming Opportunities</h3>
        <ul className="space-y-2 text-gray-700">
          <li>🏃 District Sprint Meet – Registration closes soon</li>
          <li>🏆 Inter-College Athletics Championship</li>
        </ul>
      </div>

      {/* ===== PERFORMANCE INSIGHT ===== */}
      <div className="bg-white p-5 rounded shadow mb-6">
        <h3 className="font-semibold mb-2">📊 Performance Insight</h3>
        <p className="text-gray-600">
          Your training consistency is stable. Maintain regular practice to
          unlock the next level in your sports career roadmap.
        </p>
      </div>

      <a
        href="/activity"
        className="inline-block bg-blue-600 text-white px-6 py-3 rounded shadow"
      >
        ▶ Start Activity (GPS + Video)
      </a>
    </Layout>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-5 rounded shadow">
      <h3 className="text-gray-500">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
