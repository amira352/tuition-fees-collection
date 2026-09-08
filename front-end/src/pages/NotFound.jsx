import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <div className="notfound">
      <p className="notfound-code">404</p>
      <h1 className="notfound-title">Page not found</h1>
      <p className="notfound-text">The page you're looking for doesn't exist.</p>
      <Link to="/" className="notfound-btn">Back to home</Link>
    </div>
  );
}
