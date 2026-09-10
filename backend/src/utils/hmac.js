import crypto from "crypto";

export const createNationalIdHmac = (nationalId) => {
  if (!process.env.NATIONAL_ID_HMAC_SECRET) {
    throw new Error("NATIONAL_ID_HMAC_SECRET is missing");
  }

  return crypto
    .createHmac(
      "sha256",
      process.env.NATIONAL_ID_HMAC_SECRET
    )
    .update(nationalId)
    .digest("hex");
};