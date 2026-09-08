import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

const getEncryptionKey = () => {
  const key = process.env.NATIONAL_ID_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("NATIONAL_ID_ENCRYPTION_KEY is missing");
  }

  return Buffer.from(key, "hex");
};

export const encryptNationalId = (nationalId) => {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    iv
  );

  let encrypted = cipher.update(
    nationalId,
    "utf8",
    "hex"
  );

  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    encrypted
  });
};