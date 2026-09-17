import {
  findInstitutionProfileById,
  updateInstitutionPhone,
  updateInstitutionAvatar
} from "../repositories/institution.repository.js";


const badRequest = (message, field) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  if (field) error.field = field;
  return error;
};

const notFound = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  return error;
};


// Loose on purpose: institutions may enter a landline, an extension, or an
// international format — this only rejects obvious garbage, not a specific
// country's numbering plan.
const PHONE_RE = /^[0-9+()\-.\s]{6,30}$/;

const AVATAR_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/;

// Matches the frontend's 2MB raw-image cap (AvatarPicker in
// InstitutionProfile.jsx), with room for base64's ~33% size overhead.
const AVATAR_MAX_LENGTH = 2_800_000;


export const getInstitutionProfile = async (institutionId) => {
  const profile = await findInstitutionProfileById(institutionId);

  if (!profile) {
    throw notFound("Institution not found");
  }

  return profile;
};


export const updateInstitutionProfilePhone = async (institutionId, phone) => {
  const trimmed = typeof phone === "string" ? phone.trim() : "";

  if (trimmed && !PHONE_RE.test(trimmed)) {
    throw badRequest("Phone number is not valid", "phone");
  }

  const existing = await findInstitutionProfileById(institutionId);

  if (!existing) {
    throw notFound("Institution not found");
  }

  return updateInstitutionPhone(institutionId, trimmed || null);
};


export const updateInstitutionProfileAvatar = async (institutionId, avatarBase64) => {
  if (!avatarBase64 || typeof avatarBase64 !== "string") {
    throw badRequest("Avatar image is required", "avatar_base64");
  }

  if (!AVATAR_DATA_URL_RE.test(avatarBase64)) {
    throw badRequest("Avatar must be a PNG, JPEG, WEBP or GIF image", "avatar_base64");
  }

  if (avatarBase64.length > AVATAR_MAX_LENGTH) {
    throw badRequest("Avatar image must be 2MB or smaller", "avatar_base64");
  }

  const existing = await findInstitutionProfileById(institutionId);

  if (!existing) {
    throw notFound("Institution not found");
  }

  return updateInstitutionAvatar(institutionId, avatarBase64);
};
