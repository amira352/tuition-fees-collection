import { lookupCustomerAccounts } from "../services/bankAccounts.service.js";

export const getAccounts = async (req, res, next) => {
  try {
    const result = await lookupCustomerAccounts({
      nationalId: req.params.nationalId,
      bankEmployeeId: req.user.userId
    });
    return res.json(result);
  } catch (error) {
    next(error);
  }
};
