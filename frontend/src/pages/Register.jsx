import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name:"", email:"", password:"", role:"student"
  });
  const navigate = useNavigate();

  const register = async () => {
    await fetch("http://localhost:5000/api/auth/register", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(form)
    });
    navigate("/");
  };

  return (
    <div>
      <h2>Register</h2>

      <input placeholder="Name"
        onChange={e=>setForm({...form,name:e.target.value})}/>

      <input placeholder="Email"
        onChange={e=>setForm({...form,email:e.target.value})}/>

      <input type="password" placeholder="Password"
        onChange={e=>setForm({...form,password:e.target.value})}/>

      <select onChange={e=>setForm({...form,role:e.target.value})}>
        <option value="student">Student</option>
        <option value="teacher">Teacher</option>
        <option value="admin">Admin</option>
      </select>

      <button onClick={register}>Register</button>
    </div>
  );
}
