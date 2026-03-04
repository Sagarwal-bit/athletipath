const crypto = require("crypto");

function getKey() {
  const secret = process.env.DATA_ENCRYPTION_KEY || "athletipath_default_key_change_me";
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptText(plainText) {
  if (plainText === undefined || plainText === null) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptText(cipherText) {
  if (!cipherText || !String(cipherText).includes(":")) return null;
  const [ivHex, payloadHex] = String(cipherText).split(":");
  const iv = Buffer.from(ivHex, "hex");
  const payload = Buffer.from(payloadHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = {
  encryptText,
  decryptText,
};
