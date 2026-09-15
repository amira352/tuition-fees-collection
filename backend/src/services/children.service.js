import {
  findChildById,
  deactivateChildById
} from "../repositories/children.repository.js";


const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};


const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};


export const deactivateChild = async ({
  institutionId,
  childId
}) => {

  // 1. Find the child scoped to this institution
  const child =
    await findChildById({ childId, institutionId });

  if (!child) {
    throw notFound(
      "Student not found for this institution"
    );
  }

  // 2. Do not allow deactivating an already inactive child
  if (!child.is_active) {
    throw badRequest("This student is already inactive");
  }

  // 3. Deactivate the child
  const updated = await deactivateChildById(childId);

  // 4. Return result
  return {
    message: "Student deactivated successfully",
    child: updated
  };
};
