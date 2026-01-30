export default function Biometric() {

  const registerBio = async () => {
    await fetch("http://localhost:5000/api/biometric/register",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        user_id:1,
        public_key:"demo-public-key"
      })
    });

    alert("Biometric registered (demo)");
  };

  const loginBio = async () => {
    const res = await fetch("http://localhost:5000/api/biometric/verify",{
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
