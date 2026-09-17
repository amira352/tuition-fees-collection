import {
  getInstitutionProfile,
  updateInstitutionProfilePhone,
  updateInstitutionProfileAvatar
} from "../services/institutionProfile.service.js";


export const getInstitutionProfileController = async (
  req,
  res,
  next
) => {

  try {

    const { id } = req.params;

    const result =
      await getInstitutionProfile(id);

    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};


export const updateInstitutionProfileController = async (
  req,
  res,
  next
) => {

  try {

    const { id } = req.params;
    const { phone } = req.body;

    const result =
      await updateInstitutionProfilePhone(id, phone);

    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};


export const updateInstitutionAvatarController = async (
  req,
  res,
  next
) => {

  try {

    const { id } = req.params;
    const { avatar_base64: avatarBase64 } = req.body;

    const result =
      await updateInstitutionProfileAvatar(id, avatarBase64);

    return res.status(200).json(result);

  } catch (error) {

    next(error);

  }
};
