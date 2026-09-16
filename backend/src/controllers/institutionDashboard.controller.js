import {
  getInstitutionDashboard
} from "../services/institutionDashboard.service.js";


export const getInstitutionDashboardController = async (
  req,
  res,
  next
) => {

  try {

    const { id } = req.params;

    const result =
      await getInstitutionDashboard(id);

    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};
