import { Link, useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthUser } from "../utils/auth";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const user = getAuthUser();
  const role = user?.role || "student";

  const logout = () => {
    clearAuthSession();
    navigate("/", { replace: true });
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", roles: ["student", "coach", "admin", "super_admin"] },
    { to: "/activity", label: "Activity", roles: ["student"] },
    { to: "/roadmap", label: "Roadmap", roles: ["student"] },
    { to: "/progress", label: "Progress", roles: ["student"] },
    { to: "/charts", label: "Analytics", roles: ["student", "coach", "admin", "super_admin"] },
    { to: "/events", label: "Events", roles: ["student", "coach", "admin", "super_admin"] },
    { to: "/notifications", label: "Notifications", roles: ["student", "coach", "admin", "super_admin"] },
    { to: "/trust-score", label: "Trust Score", roles: ["student", "coach"] },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white p-5">
        <h2 className="text-xl font-bold mb-6">AthletiPath</h2>
        <p className="text-xs text-gray-300 mb-4">
          {user ? `${user.name} (${user.role})` : "Logged In"}
        </p>

        <nav className="space-y-3">
          {navItems
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <Link key={item.to} className="block hover:text-blue-400" to={item.to}>
                {item.label}
              </Link>
            ))}
        </nav>

        <button
          className="mt-6 w-full bg-red-600 text-white rounded px-3 py-2 text-sm"
          onClick={logout}
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  );
}
