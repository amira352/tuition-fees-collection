import { useLocation } from "react-router-dom";
import "./ComingSoon.css";

const TITLES = {
  fees: "Fees",
  discounts: "Discounts",
  payments: "Payments",
  "epp-plans": "EPP Plans",
  reports: "Reports",
  notifications: "Notifications",
  profile: "Institution Profile",
};

export default function ComingSoon() {
  const { pathname } = useLocation();
  const slug = pathname.split("/").filter(Boolean).pop();
  const title = TITLES[slug] || "This section";

  return (
    <div className="coming-soon">
      <h1 className="coming-soon-title">{title}</h1>
      <p className="coming-soon-text">This section is coming soon.</p>
    </div>
  );
}
