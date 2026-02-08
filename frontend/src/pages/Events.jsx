import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Events() {
  const [events,setEvents] = useState([]);

  useEffect(()=>{
    fetch("http://localhost:5000/api/events")
      .then(res=>res.json())
      .then(data=>setEvents(data));
  },[]);

  return (
    <div className="bg-white p-5 rounded shadow mb-4">
        <Layout>
      <h1 className="text-2xl font-bold mb-6">
        Upcoming Events
      </h1>

      {/* events cards */}
    </Layout>

      {events.map(e => (
  <div
    key={e.id}
    className="bg-white p-5 rounded shadow mb-4"
  >
    <h3 className="font-semibold text-lg">
      {e.title}
    </h3>

    <p className="text-gray-600">
      Location: {e.location}
    </p>

    <p className="text-gray-600">
      Deadline: {e.deadline}
    </p>
  </div>
))}

    </div>
  );
}
