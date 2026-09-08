import { getUser } from "../lib/auth";
import "./Dashboard.css";

export default function Dashboard() {
  const user = getUser();

  return (
    <div className="page">
      <h1 className="page-title">
        Welcome{user?.name ? `, ${user.name}` : ""}
      </h1>
      <p className="page-subtitle">
        Signed in as {user?.email}
        {user?.role && (
          <span className="role-badge">{user.role.replace("_", " ")}</span>
        )}
      </p>

      <div className="placeholder-card">
        The tuition-fee management screens will live here.
      </div>
    </div>
  );
}
