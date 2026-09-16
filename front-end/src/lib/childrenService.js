import { apiPut } from "./api";

/**
 * PUT /api/institutions/:id/children/:childId/deactivate
 * No request body.
 * Resolves to { message, child: { id, name, student_code, is_active } }.
 * Rejects with error.status:
 *   400 "This student is already inactive"
 *   403 not this institution's student
 *   404 "Student not found for this institution"
 */
export function deactivateChild(institutionId, childId) {
  return apiPut(
    `/institutions/${encodeURIComponent(institutionId)}/children/${encodeURIComponent(childId)}/deactivate`,
    {}
  );
}
