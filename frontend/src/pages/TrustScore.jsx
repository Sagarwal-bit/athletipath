import { useEffect, useState } from "react";
import Layout from "../components/Layout";

export default function TrustScore() {
  const [score,setScore] = useState(0);

  useEffect(()=>{
    fetch("http://localhost:5000/api/trust/1")
      .then(res=>res.json())
      .then(data=>setScore(data.score));
  },[]);

  return (
    <div className="bg-white p-5 rounded shadow mb-4">
     <Layout>
      <h1 className="text-2xl font-bold mb-6">
        Trust Score
      </h1>

      {/* trust score UI */}
    </Layout>
      <h1>{score}/100</h1>
    </div>
  );
}
