import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { authFetch, getAuthUser } from "../utils/auth";

export default function Dashboard() {
  const user = getAuthUser();
  const role = user?.role || "student";
  const [data, setData] = useState(null);
  const [securityData, setSecurityData] = useState(null);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [smtpMessage, setSmtpMessage] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        if (role === "student") {
          const [analyticsRes, recRes] = await Promise.all([
            authFetch("/api/v2/analytics/student", { signal: controller.signal }),
            authFetch("/api/v2/student/recommendations", { signal: controller.signal }),
          ]);

          if (!analyticsRes.ok) throw new Error("Failed to load student analytics");
          const analytics = await analyticsRes.json();
          setData(analytics);

          if (recRes.ok) {
            const rec = await recRes.json();
            setRecommendations(rec.recommendations || []);
          }
          return;
        }

        if (role === "coach") {
          const res = await authFetch("/api/v2/analytics/coach", { signal: controller.signal });
          if (!res.ok) throw new Error("Failed to load coach dashboard");
          setData(await res.json());
          return;
        }

        const adminRes = await authFetch("/api/v2/analytics/admin", { signal: controller.signal });
        if (!adminRes.ok) throw new Error("Failed to load admin dashboard");
        setData(await adminRes.json());
        const [secRes, smtpRes] = await Promise.all([
          authFetch("/api/v2/admin/security-dashboard", { signal: controller.signal }),
          authFetch("/api/v2/admin/smtp-status", { signal: controller.signal }),
        ]);
        if (secRes.ok) setSecurityData(await secRes.json());
        if (smtpRes.ok) setSmtpStatus(await smtpRes.json());
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      }
    }

    load();
    return () => controller.abort();
  }, [role]);

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

  const sendSmtpTest = async () => {
    setSmtpMessage("");
    const res = await authFetch("/api/v2/admin/smtp-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testEmail }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setSmtpMessage(payload.error || "Failed to send SMTP test email");
      return;
    }
    setSmtpMessage(payload.message || "Test email sent");
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">{role[0].toUpperCase() + role.slice(1)} Dashboard</h1>

      {role === "student" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card title="Months Tracked" value={data.monthlyDistance.length} />
            <Card title="Speed Trend" value={data.insights?.speedTrend ?? 0} />
            <Card title="Consistency" value={`${data.insights?.consistencyScore ?? 0}%`} />
            <Card title="Milestones Done" value={data.milestoneTimeline.length} />
          </div>

          <div className="bg-white p-5 rounded shadow mb-4">
            <h2 className="font-semibold mb-3">Explainable Recommendations</h2>
            {(recommendations || []).map((r) => (
              <div key={r.code} className="border rounded p-3 mb-2">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-gray-600">Reason: {r.reason}</p>
                <p className="text-xs text-gray-500 mt-1">Priority: {r.priority}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {role === "coach" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card title="Students" value={data.studentPerformance?.length || 0} />
            <Card title="Risk Alerts" value={data.riskAlerts?.length || 0} />
            <Card title="Top Performers" value={data.topPerformers?.length || 0} />
            <Card title="Inactive" value={data.inactiveStudents?.length || 0} />
          </div>

          <List title="Risk Alerts" rows={data.riskAlerts || []} rowText={(r) => `${r.name} (${r.type})`} />
          <List title="Top Performers" rows={data.topPerformers || []} rowText={(r) => `${r.name} | trust ${r.trustScore}`} />
        </>
      )}

      {(role === "admin" || role === "super_admin") && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card title="Total Users" value={data.totals?.totalUsers || 0} />
            <Card title="Students" value={data.totals?.totalStudents || 0} />
            <Card title="Coaches" value={data.totals?.totalCoaches || 0} />
            <Card title="Admins" value={data.totals?.totalAdmins || 0} />
            <Card title="Avg Trust" value={data.avgTrust || 0} />
          </div>

          <List
            title="Domain Distribution"
            rows={data.domainDistribution || []}
            rowText={(r) => `${r.domain}: ${r.users}`}
          />
          <List
            title="Platform Growth"
            rows={data.platformGrowth || []}
            rowText={(r) => `${r.month}: ${r.newUsers} users`}
          />
          <List
            title="Failed Login Trend"
            rows={securityData?.failedLogins || []}
            rowText={(r) => `${r.day}: ${r.count} failed logins`}
          />
          <List
            title="Top Risk Users"
            rows={securityData?.riskByUser || []}
            rowText={(r) => `${r.name} (${r.role}) - risk ${r.riskScore} [${r.category}]`}
          />
          <div className="bg-white p-5 rounded shadow mb-4">
            <h3 className="font-semibold mb-2">SMTP Status</h3>
            <p className="text-sm">
              Configured: <span className="font-medium">{smtpStatus?.configured ? "Yes" : "No"}</span>
            </p>
            <p className="text-sm">
              Reachable: <span className="font-medium">{smtpStatus?.ok ? "Yes" : "No"}</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">{smtpStatus?.message || "No status"}</p>

            <div className="mt-3 flex gap-2">
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                placeholder="test recipient email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                type="button"
                onClick={sendSmtpTest}
                className="bg-blue-600 text-white rounded px-3 py-2 text-sm"
              >
                Send Test
              </button>
            </div>
            {smtpMessage ? <p className="text-xs mt-2">{smtpMessage}</p> : null}
          </div>
        </>
      )}
    </Layout>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function List({ title, rows, rowText }) {
  return (
    <div className="bg-white p-5 rounded shadow mb-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      {!rows.length ? (
        <p className="text-sm text-gray-500">No data</p>
      ) : (
        rows.map((row, idx) => (
          <p key={idx} className="text-sm py-1 border-b last:border-0">{rowText(row)}</p>
        ))
      )}
    </div>
  );
}
