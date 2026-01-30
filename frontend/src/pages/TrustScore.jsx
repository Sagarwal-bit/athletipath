import { useEffect, useState } from "react";

export default function TrustScore() {
  const [score,setScore] = useState(0);

  useEffect(()=>{
    fetch("http://localhost:5000/api/trust/1")
      .then(res=>res.json())
      .then(data=>setScore(data.score));
  },[]);

  return (
    <div>
      <h2>My Trust Score</h2>
      <h1>{score}/100</h1>
    </div>
  );
}
