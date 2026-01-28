import { useEffect, useState } from "react";

export default function Progress() {
  const [progress, setProgress] = useState([]);

  useEffect(()=>{
    fetch("http://localhost:5000/api/progress/1")
      .then(res=>res.json())
      .then(data=>setProgress(data));
  },[]);

  return (
    <div>
      <h2>My Progress</h2>

      {progress.map((p,i)=>(
        <div key={i} style={{padding:10,border:"1px solid #555",margin:8}}>
          <b>{p.level_name}</b> — {p.status}
          {p.performance && <p>Performance: {p.performance}</p>}
        </div>
      ))}
    </div>
  );
}
