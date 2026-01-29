import { useEffect, useState } from "react";

export default function Notifications() {
  const [notes,setNotes] = useState([]);

  useEffect(()=>{
    fetch("http://localhost:5000/api/notifications/1")
      .then(res=>res.json())
      .then(data=>setNotes(data));
  },[]);

  return (
    <div>
      <h2>My Notifications</h2>

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
