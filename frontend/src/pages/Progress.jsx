import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Progress() {
  const [level, setLevel] = useState(1);
  const [trust, setTrust] = useState(50);

  useEffect(() => {
    fetch("http://localhost:5000/api/progress/1")
      .then(res => res.json())
      .then(data => setLevel(data.level));

    fetch("http://localhost:5000/api/trust/1")
      .then(res => res.json())
      .then(data => setTrust(data.score));
  }, []);

  let message = "Progressing normally";
  if (trust < 40) message = "Progress locked due to low trust score";
  else if (trust <= 70) message = "Progress slowed, improve consistency";

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">📈 Progress</h1>

      <div className="bg-white p-6 rounded shadow">
        <p className="text-lg">
          Current Level: <b>Level {level}</b>
        </p>

        <p className="mt-2 text-gray-600">
          Trust Score: <b>{trust}</b>
        </p>

        <p className="mt-3 font-medium">
          {message}
        </p>
      </div>
    </Layout>
  );
}
