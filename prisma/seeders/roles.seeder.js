import { SYSTEM_ROLE_CODES } from "../../src/configs/app.config";

const systemRoles = [
  {
    code: SYSTEM_ROLE_CODES.SUPER_ADMIN,
    name: "Super Administrator",
    description:
      "Bootstrap platform administrator with complete approved system access.",
    isActive: true,
    isSystem: true,
  },
  {
    code: SYSTEM_ROLE_CODES.ADMIN,
    name: "Administrator",
    description:
      "Manages platform users, distributors, retailers and operational configuration.",
    isActive: true,
    isSystem: true,
  },
  {
    code: SYSTEM_ROLE_CODES.DISTRIBUTOR,
    name: "Distributor",
    description:
      "Manages assigned retailers and accesses wallet, commission and reports.",
    isActive: true,
    isSystem: true,
  },
  {
    code: SYSTEM_ROLE_CODES.RETAILER,
    name: "Retailer",
    description:
      "Uses enabled financial services such as AEPS, DMT and payout.",
    isActive: true,
    isSystem: true,
  },
];

export async function seedRoles(prisma) {
  console.log("🔐 Seeding system roles...");

  const seededRoles = [];

  for (const role of systemRoles) {
    const seededRole = await prisma.role.upsert({
      where: {
        code: role.code,
      },

      update: {
        name: role.name,
        description: role.description,

        // System roles should remain protected and available.
        isActive: true,
        isSystem: true,
      },

      create: role,
    });

    seededRoles.push(seededRole);

    console.log(`   ✓ ${seededRole.code}`);
  }

  return new Map(seededRoles.map((role) => [role.code, role]));
}
