export default function Dashboard() {
  const role = localStorage.getItem("role");

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Logged in as: <b>{role}</b></p>

      {role==="admin" && <p>Admin Panel</p>}
      {role==="teacher" && <p>Teacher Panel</p>}
      {role==="student" && <p>Student Panel</p>}
    </div>
  );
}
