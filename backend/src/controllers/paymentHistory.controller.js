import { getPaymentHistory } from "../services/paymentHistory.service.js";

export const paymentHistory = async (req, res, next) => {
  try {
    const result = await getPaymentHistory({
      parentId: req.query.parentId,
      childId: req.query.childId,
      institutionId: req.query.institutionId,
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
