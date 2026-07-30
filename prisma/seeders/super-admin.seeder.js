import argon2 from "argon2";

import { SYSTEM_ROLE_CODES } from "./roles.seeder.js";

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for the Super Administrator seeder.`);
  }

  return value;
}

export async function seedSuperAdmin(prisma, { roles }) {
  console.log("\n👑 Seeding initial Super Administrator...");

  const superAdminRole = roles.get(SYSTEM_ROLE_CODES.SUPER_ADMIN);

  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role was not found.");
  }

  const username = getRequiredEnvironmentVariable(
    "SUPER_ADMIN_USERNAME",
  ).toLowerCase();

  const firstName = getRequiredEnvironmentVariable(
    "SUPER_ADMIN_FIRSTNAME",
  ).toLowerCase();

  const lastName = getRequiredEnvironmentVariable(
    "SUPER_ADMIN_LASTNAME",
  ).toLowerCase();

  const email =
    getRequiredEnvironmentVariable("SUPER_ADMIN_EMAIL").toLowerCase();

  const phoneNumber = getRequiredEnvironmentVariable(
    "SUPER_ADMIN_PHONE_NUMBER",
  );

  const password = getRequiredEnvironmentVariable("SUPER_ADMIN_PASSWORD");

  const gender = (process.env.SUPER_ADMIN_GENDER ?? "OTHER").toUpperCase();

  if (password.length < 12) {
    throw new Error(
      "SUPER_ADMIN_PASSWORD must contain at least 12 characters.",
    );
  }

  const existingUser = await prisma.identity.findFirst({
    where: {
      OR: [{ username }, { email }, { phoneNumber }],
    },

    include: {
      role: true,
    },
  });

  if (existingUser) {
    const sameIdentity =
      existingUser.username === username &&
      existingUser.email === email &&
      existingUser.phoneNumber === phoneNumber;

    if (!sameIdentity) {
      throw new Error(
        "The configured Super Administrator username, email or phone number is already being used by another identity.",
      );
    }

    if (existingUser.role.code !== SYSTEM_ROLE_CODES.SUPER_ADMIN) {
      throw new Error(
        "The configured identity already exists but does not have the SUPER_ADMIN role. It will not be promoted automatically.",
      );
    }

    console.log(
      `   ✓ Super Administrator already exists: ${existingUser.email}`,
    );

    return existingUser;
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  const superAdmin = await prisma.identity.create({
    data: {
      firstName,
      lastName,
      username,
      email,
      phoneNumber,
      passwordHash,
      gender,

      roleId: superAdminRole.id,

      isEmailVerified: true,
      isPhoneVerified: true,
    },

    include: {
      role: true,
    },
  });

  console.log(`   ✓ Created: ${superAdmin.email}`);

  return superAdmin;
}
