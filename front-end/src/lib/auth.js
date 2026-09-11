import { apiPost } from "./api";

const KEYS = ["token", "role", "user", "mustChangePassword"];

/*
 * First-login password reset — frontend-only for now.
 *
 * A first login is one where this browser has never recorded the account
 * completing the reset (the per-user "pw_set_<id>" marker). On such a login we
 * raise the "mustChangePassword" flag for the session; ProtectedRoute then holds
 * the user on /set-password until they choose a password.
 *
 * When the backend adds a real flag, replace the marker check below with:
 *   const mustChange = Boolean(data.mustChangePassword ?? data.user?.mustChangePassword);
 * and have changePassword() POST to /auth/changePassword.
 */
function pwSetKey(user) {
  return `pw_set_${user?.id ?? user?.email ?? "unknown"}`;
}

export async function login(email, password) {
  const data = await apiPost("/auth/loginUser", {
    email: email.trim(),
    password,
  });

  localStorage.setItem("token", data.token);
  localStorage.setItem("role", data.role);
  localStorage.setItem("user", JSON.stringify(data.user));

  const mustChange = localStorage.getItem(pwSetKey(data.user)) !== "1";
  localStorage.setItem("mustChangePassword", mustChange ? "1" : "");

  return { ...data, mustChangePassword: mustChange };
}

export async function changePassword(_currentPassword, _newPassword) {
  // TODO: when the backend exposes it, POST { currentPassword, newPassword } to
  // /auth/changePassword and only run the lines below on a 200.
  const user = getUser();
  if (user) localStorage.setItem(pwSetKey(user), "1");
  localStorage.removeItem("mustChangePassword");
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
