import "dotenv/config";

import { seedPermissions } from "./seeders/permissions.seeder.js";
import { seedRoles } from "./seeders/roles.seeder.js";
import { seedRolePermissions } from "./seeders/role-permissions.seeder.js";
import { seedSuperAdmin } from "./seeders/super-admin.seeder.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("\n🌱 Starting Identity Service database seeding...\n");

  const permissions = await seedPermissions(prisma);
  const roles = await seedRoles(prisma);

  const admin = await seedSuperAdmin(prisma, {
    roles,
  });

  await seedRolePermissions(prisma, {
    roles,
    permissions,
    adminId: admin.id,
  });

  console.log("\n✅ Identity Service database seeded successfully.\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Database seeding failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
