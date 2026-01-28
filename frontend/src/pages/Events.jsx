import { useEffect, useState } from "react";

export default function Events() {
  const [events,setEvents] = useState([]);

  useEffect(()=>{
    fetch("http://localhost:5000/api/events")
      .then(res=>res.json())
      .then(data=>setEvents(data));
  },[]);

  return (
    <div>
      <h2>Upcoming Events</h2>

      {events.map(e=>(
        <div key={e.id} style={{border:"1px solid #444",padding:10,margin:8}}>
          <h4>{e.title}</h4>
          <p>{e.location}</p>
          <p>Date: {e.event_date}</p>
          <p>Deadline: {e.deadline}</p>
        </div>
      ))}
    </div>
  );
}
