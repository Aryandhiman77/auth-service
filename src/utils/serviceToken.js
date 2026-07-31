import crypto from "crypto";
const generateRefreshToken = () => {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  return refreshToken;
};

console.log(generateRefreshToken());
