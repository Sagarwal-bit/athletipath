export const API_BASE = "http://localhost:5000";
let refreshInFlight = null;

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

export function getAuthUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession({ token, refreshToken, role, user }) {
  if (token) localStorage.setItem("token", token);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  if (role) localStorage.setItem("role", role);
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

export function setRefreshToken(refreshToken) {
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE}/api/v2/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearAuthSession();
    return null;
  }

  const data = await response.json();
  setAuthSession({
    token: data.token,
    role: data.user?.role,
    user: data.user,
  });
  return data.token;
}

export async function authFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status !== 401 || path.includes("/api/v2/auth/refresh")) {
    return response;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  const refreshedToken = await refreshInFlight;
  if (!refreshedToken) {
    clearAuthSession();
    return response;
  }

  const retryHeaders = new Headers(options.headers || {});
  retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: retryHeaders,
  });
}
