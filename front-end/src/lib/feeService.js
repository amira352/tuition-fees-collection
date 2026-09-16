import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export function getInstitutionFees(institutionId) {
  return apiGet(`/institutions/${encodeURIComponent(institutionId)}/fees`);
}

export function createInstitutionFee(institutionId, payload) {
  return apiPost(`/institutions/${encodeURIComponent(institutionId)}/fees`, payload);
}

/**
 * PUT /api/institutions/:id/fees/:feeId
 * payload: { fee_type, period, amount, currency }
 * Resolves to { message, student: { id, name, student_code }, fee }.
 * Rejects with error.status 400 (validation), 404 (fee not found), 409 (payment already made / duplicate fee).
 */
export function updateInstitutionFee(institutionId, feeId, payload) {
  return apiPut(
    `/institutions/${encodeURIComponent(institutionId)}/fees/${encodeURIComponent(feeId)}`,
    payload
  );
}

/**
 * DELETE /api/institutions/:id/fees/:feeId
 * Resolves to { message, student: { id, name, student_code }, deletedFee: { id, fee_type, period, amount } }.
 * Rejects with error.status 404 (fee not found) or 409 (payment already made).
 */
export function deleteInstitutionFee(institutionId, feeId) {
  return apiDelete(
    `/institutions/${encodeURIComponent(institutionId)}/fees/${encodeURIComponent(feeId)}`
  );
}
