const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...extraHeaders,
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response had no JSON body
  }

  if (!res.ok) {
    const error = new Error(data?.message || "Request failed. Please try again.");
    error.status = res.status;
    error.code = data?.code || null;
    error.field = data?.field || null;
    error.details = data?.details || null;
    throw error;
  }
  return data;
}

export const apiGet = (path) => request(path);

// `options` can now carry extra fetch options (most importantly `headers`,
// e.g. { headers: { "Idempotency-Key": key } }) without them being silently
// dropped, which was happening before this change.
export const apiPost = (path, body, options = {}) =>
  request(path, { method: "POST", body: JSON.stringify(body), ...options });

export const apiDelete = (path) => request(path, { method: "DELETE" });