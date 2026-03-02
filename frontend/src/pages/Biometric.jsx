import { authFetch } from "../utils/auth";

export default function Biometric() {

  const registerBio = async () => {
    const res = await authFetch("/api/biometric/register",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        public_key:"demo-public-key"
      })
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Biometric registration failed");
      return;
    }

    alert("Biometric registered (demo)");
  };

  const loginBio = async () => {
    const res = await authFetch("/api/biometric/verify",{
      method:"POST"
    });
    const data = await res.json();

    if(data.success) alert("Biometric login success!");
  };

  return (
    <div>
      <h2>Biometric Login</h2>
      <button onClick={registerBio}>Register Biometric</button>
      <button onClick={loginBio}>Login with Biometric</button>
    </div>
  );
}
