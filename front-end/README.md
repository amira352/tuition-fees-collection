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

- Logo: `public/cib-logo.png`, referenced via `LOGO_SRC` at the top of `src/App.jsx`.
- Brand colours: the `--navy-*` CSS variables at the top of `src/App.css` — replace
  with the exact hex values from CIB's brand guidelines if needed.
