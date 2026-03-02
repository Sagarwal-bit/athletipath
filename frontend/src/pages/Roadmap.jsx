import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { authFetch, getAuthUser } from "../utils/auth";

export default function Roadmap() {
  const [catalog, setCatalog] = useState([]);
  const [domain, setDomain] = useState(
    localStorage.getItem("roadmap_domain") || "sports"
  );
  const [subdomain, setSubdomain] = useState(
    localStorage.getItem("roadmap_subdomain") || "sprint"
  );
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingStep, setWorkingStep] = useState("");

  const selectedDomain = useMemo(
    () => catalog.find((d) => d.key === domain),
    [catalog, domain]
  );

  useEffect(() => {
    async function loadCatalog() {
      const res = await authFetch("/api/roadmap/catalog");
      const data = await res.json();
      const domains = data.domains || [];
      setCatalog(domains);

      if (!domains.some((d) => d.key === domain)) {
        const fallbackDomain = data.defaultSelection?.domain || domains[0]?.key || "";
        const fallbackSubdomain =
          data.defaultSelection?.subdomain ||
          domains[0]?.specializations?.[0]?.key ||
          "";
        setDomain(fallbackDomain);
        setSubdomain(fallbackSubdomain);
      }
    }

    loadCatalog();
  }, [domain]);

  useEffect(() => {
    if (!domain || !subdomain) return;
    localStorage.setItem("roadmap_domain", domain);
    localStorage.setItem("roadmap_subdomain", subdomain);

    async function loadStatus() {
      const user = getAuthUser();
      if (!user?.id) return;
      setLoading(true);
      const res = await authFetch(
        `/api/roadmap/status/${user.id}?domain=${domain}&subdomain=${subdomain}`
      );
      const data = await res.json();
      setStatus(data);
      setLoading(false);
    }

    loadStatus();
  }, [domain, subdomain]);

  const handleDomainChange = (nextDomain) => {
    setDomain(nextDomain);
    const nextDomainData = catalog.find((d) => d.key === nextDomain);
    setSubdomain(nextDomainData?.specializations?.[0]?.key || "");
  };

  const markCompleted = async (stepTitle) => {
    const user = getAuthUser();
    if (!user?.id) return;
    setWorkingStep(stepTitle);
    const res = await authFetch("/api/roadmap/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain,
        subdomain,
        step: stepTitle,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to mark milestone complete");
      setWorkingStep("");
      return;
    }

    const refresh = await authFetch(
      `/api/roadmap/status/${user.id}?domain=${domain}&subdomain=${subdomain}`
    );
    setStatus(await refresh.json());
    setWorkingStep("");
  };

  const nextMilestoneTitle = status?.progress?.nextMilestone?.title || "";

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-5">Career & Sports Ladder Roadmap</h1>

      <div className="bg-white p-4 rounded shadow mb-6 flex flex-col md:flex-row gap-4">
        <select
          className="border p-2 rounded"
          value={domain}
          onChange={(e) => handleDomainChange(e.target.value)}
        >
          {catalog.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
        >
          {(selectedDomain?.specializations || []).map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading || !status ? (
        <div className="bg-white p-6 rounded shadow">Loading roadmap...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Trust Score" value={status.trust.score} />
            <StatCard
              title="Completion"
              value={`${status.progress.completionPercent}%`}
            />
            <StatCard title="Level" value={status.progress.level} />
            <StatCard
              title="ETA Next Level"
              value={`${status.progress.estimatedDaysToNextLevel} days`}
            />
          </div>

          <div
            className={`p-4 rounded shadow mb-6 ${
              status.trust.status === "locked"
                ? "bg-red-50 text-red-700"
                : status.trust.status === "limited"
                  ? "bg-yellow-50 text-yellow-800"
                  : "bg-green-50 text-green-700"
            }`}
          >
            <p className="font-semibold">
              Access Mode: {status.trust.status.toUpperCase()}
            </p>
            <p>{status.trust.message}</p>
          </div>

          <div className="bg-white p-6 rounded shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Ladder Milestones - {status.roadmap.subdomainLabel}
            </h2>
            <div className="space-y-3">
              {status.roadmap.milestones.map((milestone) => {
                const isNext = nextMilestoneTitle === milestone.title;
                const isLocked =
                  status.trust.status === "locked" ||
                  (status.trust.status === "limited" && !isNext && !milestone.completed);
                const isWorking = workingStep === milestone.title;

                return (
                  <div
                    key={milestone.number}
                    className={`border rounded p-4 flex items-center justify-between ${
                      milestone.completed
                        ? "bg-green-50 border-green-300"
                        : isNext
                          ? "bg-yellow-50 border-yellow-300"
                          : "bg-gray-50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">
                        {milestone.number}. {milestone.title}
                      </p>
                      {milestone.completed && (
                        <p className="text-sm text-green-700">Completed</p>
                      )}
                      {!milestone.completed && isNext && (
                        <p className="text-sm text-yellow-700">Next milestone</p>
                      )}
                    </div>
                    <button
                      className={`px-3 py-2 rounded text-sm text-white ${
                        milestone.completed || isLocked || isWorking
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600"
                      }`}
                      onClick={() => markCompleted(milestone.title)}
                      disabled={milestone.completed || isLocked || isWorking}
                    >
                      {milestone.completed ? "Done" : isWorking ? "Saving..." : "Mark Complete"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded shadow">
              <h3 className="font-semibold mb-2">Recommendations</h3>
              <p className="text-sm mb-2">
                Training Frequency: {status.recommendations.trainingFrequency}
              </p>
              <ul className="list-disc ml-5 text-sm space-y-1">
                {status.recommendations.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-5 rounded shadow">
              <h3 className="font-semibold mb-2">Upcoming Opportunities</h3>
              {status.notifications.upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-600">No upcoming items currently.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {status.notifications.upcomingEvents.map((event) => (
                    <li key={event.id} className="border-b pb-2">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-gray-600">
                        {event.location || "TBD"} | Deadline:{" "}
                        {new Date(event.deadline).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
