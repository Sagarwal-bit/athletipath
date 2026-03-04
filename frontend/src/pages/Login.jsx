import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, setAuthSession } from "../utils/auth";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [mfaMethod, setMfaMethod] = useState("");
  const [faceVerification, setFaceVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const finishLogin = (data) => {
    setAuthSession({
      token: data.token,
      refreshToken: data.refreshToken,
      role: data.user?.role,
      user: data.user,
    });
    if (onLoginSuccess) onLoginSuccess();
    navigate("/dashboard");
  };

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v2/auth/login/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (!data.mfaRequired) {
        finishLogin(data);
        return;
      }

      setChallengeToken(data.challengeToken);
      setMfaMethod(data.mfaMethod || "email_otp");
      if (data.emailDelivered) {
        setMessage("OTP sent. Check your email and enter the code below.");
      } else if (data.debugOtp) {
        setMessage(`Email OTP unavailable in dev. Use OTP: ${data.debugOtp}`);
      } else {
        setMessage("OTP generated. Check backend logs if email is not configured.");
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!otp) {
      setError("OTP is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v2/auth/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, otp, faceVerification }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "MFA verification failed");
        return;
      }
      finishLogin(data);
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            AthletiPath Secure Access
          </p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Sign in</h2>
          <p className="text-sm text-slate-600 mt-1">
            Trust-driven verification platform with MFA.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">
            {message}
          </div>
        ) : null}

        {!challengeToken ? (
          <form className="space-y-4" onSubmit={login}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg px-4 py-2.5 font-semibold"
            >
              {loading ? "Please wait..." : "Continue to MFA"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={verifyOtp}>
            <div className="text-sm text-slate-600">
              MFA method: <span className="font-semibold text-slate-800">{mfaMethod}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">One-Time Password</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 tracking-wider"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            {mfaMethod === "email_otp_face" ? (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" onChange={(e) => setFaceVerification(e.target.checked)} />
                Face verification completed
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg px-4 py-2.5 font-semibold"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                className="border border-slate-300 rounded-lg px-4 py-2.5 font-semibold text-slate-700"
                onClick={login}
                disabled={loading}
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        <p className="text-sm text-slate-600 mt-6 text-center">
          New here?{" "}
          <button
            type="button"
            className="text-blue-700 font-semibold"
            onClick={() => navigate("/register")}
          >
            Create account
          </button>
        </p>
      </div>
    </div>
  );
}
