import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/dashboard/summary/1")
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <Layout>Loading...</Layout>;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="bg-white p-5 rounded shadow">
          <h3 className="text-gray-500">Activities</h3>
          <p className="text-3xl font-bold">{data.activities}</p>
        </div>

        <div className="bg-white p-5 rounded shadow">
          <h3 className="text-gray-500">Distance (km)</h3>
          <p className="text-3xl font-bold">
  {Number(data.distance).toFixed(2)} km
</p>

        </div>

        <div className="bg-white p-5 rounded shadow">
          <h3 className="text-gray-500">Trust Score</h3>
          <p className="text-3xl font-bold">{data.trust}</p>
        </div>

        <div className="bg-white p-5 rounded shadow">
          <h3 className="text-gray-500">Upcoming Events</h3>
          <p className="text-3xl font-bold">{data.events}</p>
        </div>

      </div>
    </Layout>
  );
}
