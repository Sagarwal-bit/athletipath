import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar
} from "recharts";
import Layout from "../components/Layout";

export default function Charts() {
  const [activity, setActivity] = useState([]);
  const [trust, setTrust] = useState(0);

  useEffect(() => {
    fetch("http://localhost:5000/api/charts/activity/1")
      .then(res => res.json())
      .then(setActivity);

    fetch("http://localhost:5000/api/charts/trust/1")
      .then(res => res.json())
      .then(data => setTrust(data.score));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">
        Analytics Dashboard
      </h1>

      <h3 className="font-semibold mt-6">Distance Over Time</h3>
      <LineChart width={500} height={250} data={activity}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <CartesianGrid />
        <Line type="monotone" dataKey="distance" />
      </LineChart>

      <h3 className="font-semibold mt-6">Activity Distribution</h3>
      <BarChart width={500} height={250} data={activity}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="distance" />
      </BarChart>

      <h3 className="font-semibold mt-6">Trust Score</h3>
      <div className="w-52 p-5 border text-2xl">
        {trust} / 100
      </div>
    </Layout>
  );
}
