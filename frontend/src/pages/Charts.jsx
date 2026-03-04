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
  const user = getAuthUser();
  const role = user?.role || "student";
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (role !== "student") return;

    authFetch("/api/v2/analytics/student")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json();
      })
      .then((data) => setAnalytics(data))
      .catch((err) => setError(err.message));
  }, [role]);

  if (role !== "student") {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-4">Analytics</h1>
        <p>This chart view is available for students. Coach/Admin analytics are shown on Dashboard.</p>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <p className="text-red-600">Error: {error}</p>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <p>Loading analytics...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Student Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Monthly Distance (km)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.monthlyDistance || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalDistance" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Speed Improvement (km/h)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.speedImprovement || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line dataKey="avgSpeed" stroke="#2563eb" type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Trust Trend">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.trustTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line dataKey="score" stroke="#16a34a" type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="bg-white p-4 rounded shadow h-72">
          <h3 className="font-semibold mb-2">Milestone Timeline</h3>
          {(analytics.milestoneTimeline || []).map((m, i) => (
            <p key={i} className="text-sm py-1 border-b last:border-0">
              {m.step} - {String(m.completedOn).slice(0, 10)}
            </p>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white p-4 rounded shadow h-72">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="h-56">{children}</div>
    </div>
  );
}
