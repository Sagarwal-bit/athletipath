import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-5">
        <h2 className="text-xl font-bold mb-6">AthletiPath</h2>

        <nav className="space-y-3">
          <Link className="block hover:text-blue-400" to="/dashboard">Dashboard</Link>
          <Link className="block hover:text-blue-400" to="/activity">🏃 Activity</Link>
          <Link className="block hover:text-blue-400" to="/roadmap">Roadmap</Link>
          <Link className="block hover:text-blue-400" to="/progress">📈 Progress</Link>
          <Link className="block hover:text-blue-400" to="/charts">📊 Analytics</Link>
          <Link className="block hover:text-blue-400" to="/events">📅 Events</Link>
          <Link className="block hover:text-blue-400" to="/notifications">🔔 Notifications</Link>
          <Link className="block hover:text-blue-400" to="/trust-score">🔐 Trust Score</Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  );
}
