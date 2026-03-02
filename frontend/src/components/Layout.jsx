import { Link, useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthUser } from "../utils/auth";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const user = getAuthUser();

  const logout = () => {
    clearAuthSession();
    navigate("/", { replace: true });
  };
//hi
  return (
    <div className="flex min-h-screen bg-gray-100">
      
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-5">
        <h2 className="text-xl font-bold mb-6">AthletiPath</h2>
        <p className="text-xs text-gray-300 mb-4">
          {user ? `${user.name} (${user.role})` : "Logged In"}
        </p>

        <nav className="space-y-3">
          <Link className="block hover:text-blue-400" to="/dashboard">Dashboard</Link>
          <Link className="block hover:text-blue-400" to="/activity">🏃 Activity</Link>
          <Link className="block hover:text-blue-400" to="/roadmap">🧭 Roadmap</Link>
          <Link className="block hover:text-blue-400" to="/progress">📈 Progress</Link>
          <Link className="block hover:text-blue-400" to="/charts">📊 Analytics</Link>
          <Link className="block hover:text-blue-400" to="/events">📅 Events</Link>
          <Link className="block hover:text-blue-400" to="/notifications">🔔 Notifications</Link>
          <Link className="block hover:text-blue-400" to="/trust-score">🔐 Trust Score</Link>
        </nav>

        <button
          className="mt-6 w-full bg-red-600 text-white rounded px-3 py-2 text-sm"
          onClick={logout}
        >
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  );
}
