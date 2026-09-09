import { quoteInstalments, createInstalmentPlan } from "../services/epp.service.js";

export const getQuotes = async (req, res, next) => {
  try {
    const result = await quoteInstalments(req.query.amount);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const { paymentId, tenorMonths } = req.body;
    const plan = await createInstalmentPlan({ paymentId, tenorMonths });
    return res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};
