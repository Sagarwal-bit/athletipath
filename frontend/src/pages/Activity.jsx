import { useState } from "react";

export default function Activity() {
  const [pos,setPos] = useState(null);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(p=>{
      setPos(p.coords);
    });
  };

  const submitActivity = async () => {
    await fetch("http://localhost:5000/api/activity/log",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        student_id:1,
        distance:1.2,
        duration:300,
        latitude:pos.latitude,
        longitude:pos.longitude,
        video_path:"demo-video.mp4"
      })
    });

    alert("Activity saved!");
  };

  return (
    <div>
      <h2>Run Activity</h2>
      <button onClick={getLocation}>Get GPS</button>

      {pos && <p>Lat: {pos.latitude} | Lon: {pos.longitude}</p>}

      <button onClick={submitActivity}>Submit Activity</button>
    </div>
  );
}
