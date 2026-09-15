import {
  deactivateChild
} from "../services/children.service.js";


export const deactivateChildController = async (
  req,
  res,
  next
) => {

  try {

    const { id, childId } = req.params;

    const result =
      await deactivateChild({
        institutionId: id,
        childId
      });


    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};
