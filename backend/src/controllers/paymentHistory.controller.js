import { getPaymentHistory } from "../services/paymentHistory.service.js";

// An institution can only ever see its own history. Their token's userId
// IS their institution_id (see auth.service.js, signToken for role
// "institution"), and it overrides whatever institutionId the client sent
// in the query string - an institution does not get to ask for someone
// else's payments by editing a query param. back_office and admin are
// internal roles and keep whatever institutionId they passed (or none,
// meaning "all institutions").
// Exported specifically so it can be unit-tested without a database or
// network - see backend/test/paymentHistory.controller.test.js.
export const resolveInstitutionId = (user, queryInstitutionId) => {
  if (user.role === "institution") {
    return user.userId;
  }

  return queryInstitutionId;
};

export const paymentHistory = async (req, res, next) => {
  try {
    const institutionId = resolveInstitutionId(req.user, req.query.institutionId);

    const result = await getPaymentHistory({
      parentId: req.query.parentId,
      childId: req.query.childId,
      institutionId,
      status: req.query.status,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit,
      offset: req.query.offset
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
