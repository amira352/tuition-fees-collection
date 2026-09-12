const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...options.headers,
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
  }

  if (!res.ok) {
    const error = new Error(data?.message || "Request failed. Please try again.");
    error.status = res.status;
    error.details = data?.details || null; 
    throw error;
  }
  return data;
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body) });
export const apiDelete = (path) => request(path, { method: "DELETE" });

