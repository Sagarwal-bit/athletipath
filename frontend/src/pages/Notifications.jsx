import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function Notifications() {
  const [notes,setNotes] = useState([]);

  useEffect(()=>{
    fetch("http://localhost:5000/api/notifications/1")
      .then(res=>res.json())
      .then(data=>setNotes(data));
  },[]);

  return (
    <div className="bg-white p-5 rounded shadow mb-4">
        <Layout>
      <h1 className="text-2xl font-bold mb-6">
        Notifications
      </h1>

      {/* notification list */}
    </Layout>

      {notes.map((n,i)=>(
        <div key={i} style={{border:"1px solid #444",padding:10,margin:8}}>
          <b>{n.title}</b>
          <p>Deadline: {n.deadline}</p>
          <p>Status: {n.status}</p>
        </div>
      ))}
    </div>
  );
}
