import { apiGet } from "./api";

export function getInstitutionFees(institutionId) {
  return apiGet(`/institutions/${encodeURIComponent(institutionId)}/fees`);
}