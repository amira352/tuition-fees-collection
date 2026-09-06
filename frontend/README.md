# Login page — frontend

React + Vite login page for the
[tuition-fees-collection](https://github.com/amira352/tuition-fees-collection) backend.

```bash
npm install
npm run dev
```

Opens at http://localhost:5173. The backend must be running at
`http://localhost:3000` (see `API_URL` in `src/App.jsx`).

It calls `POST /api/auth/loginUser` with `{ email, password }` and, on success,
saves the returned `token` to `localStorage`.

## Branding

Branding constants are at the top of `src/App.jsx`:

- `LOGO_SRC` — set to `"/cib-logo.svg"` after saving the official CIB logo into
  `public/`. Until then an inline emblem + "CIB" wordmark is used as a placeholder
  (also `public/favicon.svg`).
- `BANK_NAME`, `PORTAL_NAME`, `CIB_ORANGE` — display text / emblem colour

Brand colours are the `--navy-*` / `--teal` / `--orange` CSS variables at the top
of `src/App.css` — replace with the exact hex values from CIB's brand guidelines.
