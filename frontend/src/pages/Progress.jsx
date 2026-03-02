import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { authFetch, getAuthUser } from "../utils/auth";

export default function Progress() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const user = getAuthUser();
    if (!user?.id) return;

    const domain = localStorage.getItem("roadmap_domain") || "sports";
    const subdomain = localStorage.getItem("roadmap_subdomain") || "sprint";

    authFetch(
      `/api/progress/${user.id}?domain=${domain}&subdomain=${subdomain}`
    )
      .then((res) => res.json())
      .then((result) => setData(result));
  }, []);

  if (!data) {
    return (
      <Layout>
        <p>Loading progress...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Progress Tracking</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card title="Current Level" value={data.level} />
        <Card title="Completion" value={`${data.completionPercent}%`} />
        <Card title="Trust Score" value={data.trustScore} />
        <Card title="ETA to Next Level" value={`${data.estimatedDaysToNextLevel} days`} />
      </div>

      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="font-semibold mb-2">Roadmap Access</h2>
        <p className="text-sm mb-1">Mode: {data.roadmapAccess}</p>
        <p className="text-sm text-gray-700">{data.roadmapMessage}</p>
        <p className="text-sm mt-3">
          Recommended training frequency:{" "}
          <span className="font-semibold">{data.trainingFrequencyRecommendation}</span>
        </p>
        <p className="text-sm mt-1">
          Current activity frequency: {data.activityFrequencyPerWeek} sessions/week
        </p>
      </div>

      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Risk Detection</h2>
        {data.riskFlags.length === 0 ? (
          <p className="text-sm text-green-700">No major risk flags detected.</p>
        ) : (
          <ul className="list-disc ml-5 text-sm space-y-1 text-red-700">
            {data.riskFlags.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="font-semibold mb-3">Improvement Tips</h2>
        <ul className="list-disc ml-5 text-sm space-y-1">
          {data.tips.map((tip, idx) => (
            <li key={idx}>{tip}</li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
