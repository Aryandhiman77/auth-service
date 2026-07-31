export const JWT_TOKEN = {
  secret: process.env.ACCESS_TOKEN_SECRET,
  expiry: process.env.ACCESS_TOKEN_EXPIRY_MS,
};

export const SYSTEM_ROLE_CODES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  DISTRIBUTOR: "DISTRIBUTOR",
  RETAILER: "RETAILER",
});

export const appConfig = {
  loginConfiguration: {
    maxLoginAttemps: 5,
    lockAccountExpiryTimeInMinutes: 15,
    refreshTokenExpiryMs: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
  forgotPasswordConfig: {
    resetLinkExpiryMinutes: 10,
  },
};
