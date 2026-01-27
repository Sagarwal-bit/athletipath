import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.msg);

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);

    navigate("/dashboard");
  };

  return (
    <div>
      <h2>Login</h2>
      <input placeholder="Email" onChange={e=>setEmail(e.target.value)} />
      <input type="password" placeholder="Password"
        onChange={e=>setPassword(e.target.value)} />
      <button onClick={login}>Login</button>

      <p onClick={()=>navigate("/register")} style={{cursor:"pointer"}}>
        Create account
      </p>
    </div>
  );
}
