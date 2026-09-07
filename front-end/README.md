# Tuition Fees Collection — Frontend

React + Vite frontend for the
[tuition-fees-collection](https://github.com/amira352/tuition-fees-collection) backend.

## Run

```bash
npm install
npm run dev
```

Opens at http://localhost:5173. The backend must be running at
`http://localhost:3000` (override with a `.env` file: `VITE_API_URL=...`).

## Structure

```
src/
  main.jsx              app entry — <BrowserRouter> + global CSS
  App.jsx               route table
  index.css             design tokens + reset (global)
  ui.css                shared UI classes: .title .field .input-shell .btn .alert ...
  lib/
    api.js              fetch wrapper (base URL, auth header, error handling)
    auth.js             login / logout / getUser / isAuthenticated  (localStorage)
  components/
    ProtectedRoute.jsx  gate for signed-in routes (also forces /set-password)
    AuthShell.jsx       centered-card layout for public pages (login, etc.)
    AppShell.jsx        top-bar layout for signed-in pages (<Outlet/> inside)
    Icons.jsx           shared inline SVG icons
  pages/
    Login.jsx           POST /api/auth/loginUser, stores JWT, redirects
    SetPassword.jsx     forced first-login password reset
    Dashboard.jsx       placeholder landing page after login
    NotFound.jsx        404
```

### First-login password reset — needs backend support

`SetPassword.jsx` + the `ProtectedRoute` guard are ready, but stay dormant until
the backend provides (see the contract comment in `src/lib/auth.js`):

1. `POST /auth/loginUser` returns `mustChangePassword: true` for accounts that
   still have their CIB-issued temporary password.
2. `POST /auth/changePassword` (Bearer token) with `{ currentPassword, newPassword }`
   — verifies, updates the hash, clears the flag.

Until then login behaves exactly as before (no reset is forced).

## Adding a page (one branch + one PR per page)

```bash
git checkout main && git pull
git checkout -b feat/<page-name>
```

1. Create `src/pages/<Name>.jsx` (+ `<Name>.css` if it needs its own styles).
2. Register it in `src/App.jsx`:
   - signed-in page → add `<Route path="/x" element={<X />} />` inside the
     `AppShell` route group
   - public page → add it next to `/login`
3. Reuse the shared classes from `ui.css` and the shells; only add CSS for what's
   genuinely page-specific.
4. `npm run build && npm run lint`, then commit **only your new files** and push:

```bash
git add src/pages/<Name>.jsx src/App.jsx
git commit -m "Add <page-name> page"
git push -u origin feat/<page-name>
```

Open a PR (base `main`). Keeping each page in its own file means branches rarely
touch the same lines.

## Branding

- Logo: `public/cib-logo.png` (referenced in `AuthShell.jsx` / `AppShell.jsx`).
- Colours: the `--navy-*` CSS variables at the top of `src/index.css`.
