import { apiGet } from "./api";

export function getDailyReport(institutionId, date) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);

  const query = params.toString();
  return apiGet(`/institutions/${encodeURIComponent(institutionId)}/reports/daily${query ? `?${query}` : ""}`);
}