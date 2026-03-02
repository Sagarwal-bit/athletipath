export const API_BASE = "http://localhost:5000";

export function getAuthToken() {
  return localStorage.getItem("token");
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

export function setAuthSession({ token, role, user }) {
  if (token) localStorage.setItem("token", token);
  if (role) localStorage.setItem("role", role);
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
}

export async function authFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthSession();
  }

  return response;
}
