import { getInstitutionFees }
  from "../repositories/fee.repository.js";


export const getInstitutionFeesService = async (institutionId) => {

  const children =
    await getInstitutionFees(institutionId);

  return {
    institution_id: institutionId,
    children
  };
};