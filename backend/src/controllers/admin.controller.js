import {
  createBackOfficeUser,
  createInstitutionUser,
  getAllUsers
} from "../services/admin.service.js";

export const addBackOfficeUser = async (req, res, next) => {
  try {
    const { email, fullName, branch, password } = req.body;

    const result = await createBackOfficeUser(
      { email, fullName, branch, password },
      req.user.userId
    );

    return res.status(201).json({
      message:
        "Back office user created. Give the temporary password to the user - they must change it at first login.",
      user: result.user,
      temporaryPassword: result.temporaryPassword
    });
  } catch (error) {
    next(error);
  }
};

export const addInstitutionUser = async (req, res, next) => {
  try {
    const { email, name, type, password } = req.body;

    const result = await createInstitutionUser(
      { email, name, type, password },
      req.user.userId
    );

    return res.status(201).json({
      message:
        "Institution user created. Give the temporary password to the institution - they must change it at first login.",
      institution: result.institution,
      temporaryPassword: result.temporaryPassword
    });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await getAllUsers();

    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};
