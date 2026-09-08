import { apiPost } from "./api";

const KEYS = ["token", "role", "user", "mustChangePassword"];

/*
 * BACKEND CONTRACT for the first-login password reset
 * ---------------------------------------------------
 * 1. POST /auth/loginUser response must flag first-time accounts, either
 *    top-level  ->  { ..., mustChangePassword: true }
 *    or on user ->  { user: { ..., mustChangePassword: true } }
 * 2. POST /auth/changePassword  (Authorization: Bearer <token>)
 *      body    { currentPassword, newPassword }
 *      success 200 (optionally a fresh { token }); server clears the flag
 *      failure 401 when currentPassword is wrong
 * Until the backend sends the flag, nothing changes — no reset is forced.
 */

export async function login(email, password) {
  const data = await apiPost("/auth/loginUser", {
    email: email.trim(),
    password,
  });

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("user", JSON.stringify(data.user));

  const mustChange = Boolean(
    data.mustChangePassword ?? data.user?.mustChangePassword,
  );
  localStorage.setItem("mustChangePassword", mustChange ? "1" : "");

  return { ...data, mustChangePassword: mustChange };
}

export async function changePassword(currentPassword, newPassword) {
  const data = await apiPost("/auth/changePassword", {
    currentPassword,
    newPassword,
  });
  if (data?.token) localStorage.setItem("token", data.token);
  localStorage.setItem("mustChangePassword", "");
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

export function mustChangePassword() {
  return localStorage.getItem("mustChangePassword") === "1";
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
