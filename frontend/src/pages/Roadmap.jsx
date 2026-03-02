import { useState } from "react";
import Layout from "../components/Layout";
import { roadmapData } from "../data/roadmapData";

export default function Roadmap() {
  const [domain, setDomain] = useState("");
  const [sub, setSub] = useState("");

  const roadmap =
    domain && sub ? roadmapData[domain]?.[sub] : null;

  const handleDomainChange = (value) => {
    setDomain(value);
    setSub("");
  };

  const markStepDone = async (step) => {
    const res = await fetch("http://localhost:5000/api/roadmap/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: 1,
        domain,
        subdomain: sub,
        step,
      }),
    });

    if (!res.ok) {
      alert("Failed to mark step as completed");
      return;
    }

    alert("Step marked done");
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">🧭 Career Roadmap</h1>

      {/* DOMAIN */}
      <select
        className="border p-2 mb-4"
        value={domain}
        onChange={(e) => handleDomainChange(e.target.value)}
      >
        <option value="">Select Domain</option>
        <option value="sports">Sports</option>
        <option value="art">Art & Craft</option>
        <option value="engineering">Engineering</option>
      </select>

      {/* SUB DOMAIN */}
      {domain && (
        <select
          className="border p-2 mb-6 ml-4"
          value={sub}
          onChange={(e) => setSub(e.target.value)}
        >
          <option value="">Select Specialization</option>
          {Object.keys(roadmapData[domain]).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      )}

      {/* ROADMAP */}
      {roadmap && (
        <div className="space-y-6">
          {roadmap.map((phase, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded shadow"
            >
              <h2 className="font-semibold text-lg mb-2">
                {phase.phase}
              </h2>

              <ul className="list-disc ml-6 text-gray-700">
                {phase.steps.map((step, i) => (
                  <li key={i} className="flex justify-between items-center">
  <span>{step}</span>

  <button
    className="text-sm bg-green-500 text-white px-2 py-1 rounded"
    onClick={() => markStepDone(step)}
  >
    Mark Done
  </button>
</li>

                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
