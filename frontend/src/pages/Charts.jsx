import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import Layout from "../components/Layout";
import { authFetch, getAuthUser } from "../utils/auth";

export default function Charts() {
  const [activity, setActivity] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const user = getAuthUser();
    if (!user?.id) return;

    const domain = localStorage.getItem("roadmap_domain") || "sports";
    const subdomain = localStorage.getItem("roadmap_subdomain") || "sprint";

    authFetch(`/api/charts/activity/${user.id}`)
      .then((res) => res.json())
      .then((rows) => {
        const parsed = rows.map((row) => ({
          ...row,
          day: String(row.day).slice(0, 10),
        }));
        setActivity(parsed);
      });

    authFetch(
      `/api/charts/summary/${user.id}?domain=${domain}&subdomain=${subdomain}`
    )
      .then((res) => res.json())
      .then((data) => setSummary(data));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

      {!summary ? (
        <p>Loading analytics...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <MetricCard title="Total Distance" value={`${summary.totalDistance.toFixed(2)} km`} />
            <MetricCard title="Average Speed" value={`${summary.averageSpeed.toFixed(2)} km/h`} />
            <MetricCard title="Weekly Frequency" value={summary.activityFrequency} />
            <MetricCard title="Trust Score" value={summary.trustScore} />
            <MetricCard
              title="Progress Completion"
              value={`${summary.progressCompletionPercent}%`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-3">Distance Over Time</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activity}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="distance" stroke="#2563eb" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-3">Activity Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Bar dataKey="distance" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white p-5 rounded shadow">
              <h3 className="font-semibold mb-2">Trust Trend</h3>
              {summary.trustTrend.map((point, idx) => (
                <p key={idx} className="text-sm">
                  {point.label}: <span className="font-medium">{point.score}</span>
                </p>
              ))}
              <p className="text-sm mt-2">
                Anomaly detections in 30 days:{" "}
                <span className="font-semibold">{summary.anomalyCount}</span>
              </p>
            </div>

            <div className="bg-white p-5 rounded shadow">
              <h3 className="font-semibold mb-2">Performance Improvement Tips</h3>
              <ul className="list-disc ml-5 text-sm space-y-1">
                {summary.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function MetricCard({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
