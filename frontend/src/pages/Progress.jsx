import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Progress() {
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/progress/1")
      .then(res => res.json())
      .then(data => setProgress(data));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">
        My Progress
      </h1>

      {progress.map((p, i) => (
        <div
          key={i}
          className="p-4 border border-gray-600 rounded mb-3"
        >
          <b>{p.level_name}</b> — {p.status}
          {p.performance && (
            <p className="mt-1">
              Performance: {p.performance}
            </p>
          )}
        </div>
      ))}
    </Layout>
  );
}
