import { apiGet, apiPost } from "./api";

export function getInstitutionFees(institutionId) {
  return apiGet(`/institutions/${encodeURIComponent(institutionId)}/fees`);
}

export function createInstitutionFee(institutionId, payload) {
  return apiPost(`/institutions/${encodeURIComponent(institutionId)}/fees`, payload);
}