import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch, setAuthSession } from "../utils/auth";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    const res = await authFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.msg);

    setAuthSession({
      token: data.token,
      role: data.role,
      user: data.user,
    });
    if (onLoginSuccess) onLoginSuccess();

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
