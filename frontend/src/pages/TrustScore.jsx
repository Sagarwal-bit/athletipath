import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { authFetch, getAuthUser } from "../utils/auth";

export default function TrustScore() {
  const [score, setScore] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTrustScore() {
      try {
        const user = getAuthUser();
        if (!user?.id) throw new Error("Session missing");
        const res = await authFetch(`/api/trust/${user.id}`);

        if (!res.ok) {
          throw new Error("Failed to load trust score");
        }

        const data = await res.json();
        setScore(data.score);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchTrustScore();
  }, []);

  // ✅ Correct place for color logic
  let trustColor = "text-yellow-500";
  if (score !== null) {
    if (score < 40) trustColor = "text-red-600";
    else if (score > 70) trustColor = "text-green-600";
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">🔐 Trust Score</h1>

      {error && <p className="text-red-600">{error}</p>}

      {score === null ? (
        <p>Loading trust score...</p>
      ) : (
        <div className="bg-white p-6 rounded shadow">
          <p className={`text-4xl font-bold ${trustColor}`}>
            {score} / 100
          </p>

          <p className="text-gray-600 mt-2">
            Calculated based on verified activity consistency and proof.
          </p>

          <p className="text-sm text-gray-600 mt-3">
            Trust score is calculated based on GPS distance validity,
            activity consistency, and video proof.
          </p>
        </div>
      )}
    </Layout>
  );
}
