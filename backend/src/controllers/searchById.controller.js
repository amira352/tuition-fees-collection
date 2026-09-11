import {
  searchParentByNationalId
} from "../services/searchById.service.js";


export const searchParent = async (
  req,
  res,
  next
) => {
  try {

    const { national_id } = req.body;

    if (!national_id) {
      return res.status(400).json({
        message: "National ID is required"
      });
    }


    /*
      For now, we assume authentication middleware
      puts the logged-in employee here:

      req.user.userId
    */

    const bankEmployeeId =
      req.user.userId;


    const result =
      await searchParentByNationalId({
        nationalId: national_id,
        bankEmployeeId
      });


    return res.status(200).json(result);

  } catch (error) {
    next(error);
  }
};