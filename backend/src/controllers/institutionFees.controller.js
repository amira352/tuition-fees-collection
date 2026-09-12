import {
  getInstitutionFeesService
} from "../services/institutionFees.service.js";


export const getInstitutionFeesController = async (
  req,
  res,
  next
) => {

  try {

    const { id } = req.params;

    const result =
      await getInstitutionFeesService(id);

    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};