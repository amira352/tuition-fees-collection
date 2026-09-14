import {
  listInstitutionEppPlans
} from "../services/epp.service.js";


export const getInstitutionEppPlansController = async (
  req,
  res,
  next
) => {

  try {

    const { id } = req.params;

    // Institutions can only see their own plans. back_office/admin can see
    // any institution's — same self-or-staff pattern already used by the
    // daily report endpoint, not a new convention.
    if (req.user.role === "institution" && req.user.userId !== id) {
      const error = new Error("Institutions can only view their own EPP plans");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      error.field = "id";
      return next(error);
    }

    const result =
      await listInstitutionEppPlans(id);

    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};