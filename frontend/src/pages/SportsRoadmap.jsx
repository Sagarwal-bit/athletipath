import { useEffect, useState } from "react";

export default function SportsRoadmap() {
  const [levels, setLevels] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/sports/roadmap/1")
      .then(res => res.json())
      .then(data => setLevels(data));
  }, []);

  return (
    <div>
      <h2>Sprint Career Roadmap</h2>

      {levels.map(l => (
        <div key={l.id} style={{border:"1px solid #555", padding:10, margin:8}}>
          <h4>{l.level_name}</h4>
          <p>Requirement: {l.min_requirement}</p>
          <p>Target: {l.target_score}</p>
        </div>
      ))}
    </div>
  );
}
