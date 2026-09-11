import "./shared.css";

export default function PlaceholderPage({ title }) {
  return (
    <div className="page">
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">This section is coming soon.</p>
      <div className="placeholder-card">Content for {title} will be added in a future update.</div>
    </div>
  );
}
