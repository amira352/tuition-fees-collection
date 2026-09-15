import {
  getInstitutionFeesService, createInstitutionFee, editInstitutionFee, deleteInstitutionFee
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


export const createInstitutionFeeController = async (
  req,
  res,
  next
) => {

  try {

    const { id } = req.params;

    const {
      student_code,
      fee_type,
      period,
      amount,
      currency
    } = req.body;


    const result =
      await createInstitutionFee({
        institutionId: id,
        studentCode: student_code,
        feeType: fee_type,
        period,
        amount,
        currency
      });


    return res.status(201).json(result);

  } catch (error) {

    next(error);

  }
};

export const editInstitutionFeeController = async (
  req,
  res,
  next
) => {

  try {

    const { id, feeId } = req.params;

    const {
      fee_type,
      period,
      amount,
      currency
    } = req.body;


    const result =
      await editInstitutionFee({
        institutionId: id,
        feeId,
        feeType: fee_type,
        period,
        amount,
        currency
      });


    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};

export const deleteInstitutionFeeController = async (
  req,
  res,
  next
) => {

  try {

    const { id, feeId } = req.params;

    const result =
      await deleteInstitutionFee({
        institutionId: id,
        feeId
      });


    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};