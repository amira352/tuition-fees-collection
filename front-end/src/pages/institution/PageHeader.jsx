import { useState } from "react";
import { Icon } from "./icons";
import "./PageHeader.css";

function formatSyncTime(date) {
  return (
    date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "GMT",
    }) + " GMT"
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4v11m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

// Shared header for institution pages: title/subtitle on the left, and on the
// right a date-range display, a "last loaded" indicator, and page actions.
// The date range and sync time are illustrative — the backend has no
// date-filterable reporting endpoint yet, so this reflects when the page's
// (mock) data was loaded into the browser, not a live server sync.
export function PageHeader({
  title,
  subtitle,
  dateRangeLabel,
  onExport,
  exportLabel = "Export",
  primaryLabel,
  onPrimaryClick,
}) {
  const [syncedAt] = useState(() => new Date());

  return (
    <div className="page-header-bar">
      <div className="page-header-titles">
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>

      <div className="page-header-actions">
        {dateRangeLabel && (
          <span className="page-header-pill">
            <Icon.calendar />
            {dateRangeLabel}
          </span>
        )}

        <span className="page-header-sync">
          <span className="page-header-sync-dot" aria-hidden="true" />
          Synced {formatSyncTime(syncedAt)}
        </span>

        {onExport && (
          <button type="button" className="page-header-btn outline" onClick={onExport}>
            <ExportIcon />
            {exportLabel}
          </button>
        )}

        {onPrimaryClick && (
          <button type="button" className="page-header-btn primary" onClick={onPrimaryClick}>
            <Icon.plus />
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
