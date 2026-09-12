import { apiPost } from "./api";

const KEYS = ["token", "role", "user", "mustChangePassword"];

export async function login(email, password) {
  const data = await apiPost("/auth/loginUser", {
    email: email.trim(),
    password,
  });

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("user", JSON.stringify(data.user));
  localStorage.setItem("mustChangePassword", data.mustChangePassword ? "1" : "");

  return data;
}

/**
 * POST /auth/change-password. Used both for the forced first-login reset and
 * for a normal voluntary password change later.
 *
 * The token this call is made with is scope-restricted ("password_change")
 * when mustChangePassword was true — the backend rejects it on every other
 * route. On success the backend issues a fresh, full-scope token, so we
 * overwrite the stored one; without this the old restricted token would
 * keep getting rejected everywhere else in the app.
 */
export async function changePassword(currentPassword, newPassword, confirmPassword) {
  const data = await apiPost("/auth/change-password", {
    currentPassword,
    newPassword,
    confirmPassword,
  });

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("mustChangePassword", data.mustChangePassword ? "1" : "");

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
  return isAuthenticated() && localStorage.getItem("mustChangePassword") === "1";
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
