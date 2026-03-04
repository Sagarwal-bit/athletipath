import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { authFetch } from "../utils/auth";

export default function Notifications() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    authFetch("/api/v2/notifications")
      .then((res) => res.json())
      .then((data) => setNotes(data));
  }, []);

  const markRead = async (id) => {
    const res = await authFetch(`/api/v2/notifications/${id}/read`, { method: "PATCH" });
    if (!res.ok) return;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, status: "read" } : n)));
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {!notes.length ? <p>No notifications.</p> : null}

      {notes.map((n) => (
        <div key={n.id} className="bg-white p-5 rounded shadow mb-4">
          <p className="font-semibold">{n.title}</p>
          <p className="text-sm text-gray-600 mb-1">{n.type}</p>
          <p>{n.message}</p>
          <p className="text-xs text-gray-500 mt-1">{String(n.notify_date).slice(0, 19).replace("T", " ")}</p>
          {n.status !== "read" ? (
            <button
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
              onClick={() => markRead(n.id)}
            >
              Mark as read
            </button>
          ) : (
            <p className="text-xs text-green-600 mt-2">Read</p>
          )}
        </div>
      ))}
    </Layout>
  );
}
