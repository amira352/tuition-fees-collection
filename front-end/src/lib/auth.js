import { apiPost } from "./api";

const KEYS = ["token", "role", "user"];

export async function login(email, password) {
  const data = await apiPost("/auth/loginUser", {
    email: email.trim(),
    password,
  });
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export function logout() {
  KEYS.forEach((k) => localStorage.removeItem(k));
}

export function getToken() {
  return localStorage.getItem("token");
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function getUser() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) return null;
    return { ...user, role: localStorage.getItem("role") };
  } catch {
    return null;
  }
}
