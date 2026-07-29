import { PERMISSION_CODES } from "./permissions.seeder.js";
import { SYSTEM_ROLE_CODES } from "./roles.seeder.js";

const rolePermissionMappings = {
  [SYSTEM_ROLE_CODES.ADMIN]: [
    PERMISSION_CODES.DASHBOARD_VIEW,

    PERMISSION_CODES.USER_CREATE,
    PERMISSION_CODES.USER_VIEW,
    PERMISSION_CODES.USER_UPDATE,
    PERMISSION_CODES.USER_ACTIVATE,
    PERMISSION_CODES.USER_DEACTIVATE,
    PERMISSION_CODES.USER_ASSIGN_ROLE,
    PERMISSION_CODES.USER_RESET_PASSWORD,

    PERMISSION_CODES.ROLE_VIEW,
    PERMISSION_CODES.PERMISSION_VIEW,

    PERMISSION_CODES.DISTRIBUTOR_CREATE,
    PERMISSION_CODES.DISTRIBUTOR_VIEW,
    PERMISSION_CODES.DISTRIBUTOR_UPDATE,

    PERMISSION_CODES.RETAILER_CREATE,
    PERMISSION_CODES.RETAILER_VIEW,
    PERMISSION_CODES.RETAILER_UPDATE,
    PERMISSION_CODES.RETAILER_ASSIGN_DISTRIBUTOR,
    PERMISSION_CODES.RETAILER_UPDATE_SERVICES,

    PERMISSION_CODES.WALLET_VIEW,
    PERMISSION_CODES.TRANSACTION_VIEW,
    PERMISSION_CODES.COMMISSION_VIEW,

    PERMISSION_CODES.REPORT_VIEW,
    PERMISSION_CODES.REPORT_EXPORT,

    PERMISSION_CODES.PROVIDER_VIEW,

    PERMISSION_CODES.SETTINGS_VIEW,

    PERMISSION_CODES.AUDIT_VIEW,
    PERMISSION_CODES.NOTIFICATION_VIEW,
  ],

  [SYSTEM_ROLE_CODES.DISTRIBUTOR]: [
    PERMISSION_CODES.DASHBOARD_VIEW,

    PERMISSION_CODES.USER_CREATE,
    PERMISSION_CODES.USER_VIEW,
    PERMISSION_CODES.USER_UPDATE,

    PERMISSION_CODES.RETAILER_CREATE,
    PERMISSION_CODES.RETAILER_VIEW,
    PERMISSION_CODES.RETAILER_UPDATE,

    PERMISSION_CODES.WALLET_VIEW,
    PERMISSION_CODES.TRANSACTION_VIEW,
    PERMISSION_CODES.COMMISSION_VIEW,

    PERMISSION_CODES.REPORT_VIEW,
    PERMISSION_CODES.REPORT_EXPORT,

    PERMISSION_CODES.NOTIFICATION_VIEW,
  ],

  [SYSTEM_ROLE_CODES.RETAILER]: [
    PERMISSION_CODES.DASHBOARD_VIEW,

    PERMISSION_CODES.WALLET_VIEW,
    PERMISSION_CODES.TRANSACTION_VIEW,

    PERMISSION_CODES.AEPS_WITHDRAW,
    PERMISSION_CODES.AEPS_BALANCE_ENQUIRY,
    PERMISSION_CODES.AEPS_MINI_STATEMENT,

    PERMISSION_CODES.DMT_CREATE,
    PERMISSION_CODES.DMT_VIEW,

    PERMISSION_CODES.PAYOUT_CREATE,
    PERMISSION_CODES.PAYOUT_VIEW,

    PERMISSION_CODES.REPORT_VIEW,
    PERMISSION_CODES.NOTIFICATION_VIEW,
  ],
};

export async function seedRolePermissions(prisma, { roles, permissions }) {
  console.log("\n🔗 Seeding role-permission mappings...");

  const allPermissionCodes = [...permissions.keys()];

  const mappings = {
    // SUPER_ADMIN receives every seeded permission.
    [SYSTEM_ROLE_CODES.SUPER_ADMIN]: allPermissionCodes,

    ...rolePermissionMappings,
  };

  for (const [roleCode, permissionCodes] of Object.entries(mappings)) {
    const role = roles.get(roleCode);

    if (!role) {
      throw new Error(
        `Cannot seed permissions: role ${roleCode} does not exist.`,
      );
    }

    const missingPermissionCodes = permissionCodes.filter(
      (permissionCode) => !permissions.has(permissionCode),
    );

    if (missingPermissionCodes.length > 0) {
      throw new Error(
        `Permissions missing for ${roleCode}: ${missingPermissionCodes.join(", ")}`,
      );
    }

    const data = permissionCodes.map((permissionCode) => ({
      roleId: role.id,
      permissionId: permissions.get(permissionCode).id,
      assignedById: "019fa892-5dd4-7023-b819-7c0ef7933126",
    }));

    await prisma.rolePermission.createMany({
      data,
      skipDuplicates: true,
    });

    console.log(`   ✓ ${roleCode}: ${permissionCodes.length} permissions`);
  }
}
