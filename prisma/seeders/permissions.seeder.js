export const PERMISSION_CODES = Object.freeze({
  DASHBOARD_VIEW: "DASHBOARD.VIEW",

  USER_CREATE: "USER.CREATE",
  USER_VIEW: "USER.VIEW",
  USER_UPDATE: "USER.UPDATE",
  USER_ACTIVATE: "USER.ACTIVATE",
  USER_DEACTIVATE: "USER.DEACTIVATE",
  USER_ASSIGN_ROLE: "USER.ASSIGN_ROLE",
  USER_RESET_PASSWORD: "USER.RESET_PASSWORD",

  ROLE_CREATE: "ROLE.CREATE",
  ROLE_VIEW: "ROLE.VIEW",
  ROLE_UPDATE: "ROLE.UPDATE",
  ROLE_ASSIGN_PERMISSION: "ROLE.ASSIGN_PERMISSION",

  PERMISSION_VIEW: "PERMISSION.VIEW",

  SESSION_VIEW: "SESSION.VIEW",
  SESSION_REVOKE: "SESSION.REVOKE",

  DISTRIBUTOR_CREATE: "DISTRIBUTOR.CREATE",
  DISTRIBUTOR_VIEW: "DISTRIBUTOR.VIEW",
  DISTRIBUTOR_UPDATE: "DISTRIBUTOR.UPDATE",

  RETAILER_CREATE: "RETAILER.CREATE",
  RETAILER_VIEW: "RETAILER.VIEW",
  RETAILER_UPDATE: "RETAILER.UPDATE",
  RETAILER_ASSIGN_DISTRIBUTOR: "RETAILER.ASSIGN_DISTRIBUTOR",
  RETAILER_UPDATE_SERVICES: "RETAILER.UPDATE_SERVICES",

  WALLET_VIEW: "WALLET.VIEW",

  TRANSACTION_VIEW: "TRANSACTION.VIEW",

  COMMISSION_VIEW: "COMMISSION.VIEW",

  AEPS_WITHDRAW: "AEPS.WITHDRAW",
  AEPS_BALANCE_ENQUIRY: "AEPS.BALANCE_ENQUIRY",
  AEPS_MINI_STATEMENT: "AEPS.MINI_STATEMENT",

  DMT_CREATE: "DMT.CREATE",
  DMT_VIEW: "DMT.VIEW",

  PAYOUT_CREATE: "PAYOUT.CREATE",
  PAYOUT_VIEW: "PAYOUT.VIEW",

  REPORT_VIEW: "REPORT.VIEW",
  REPORT_EXPORT: "REPORT.EXPORT",

  PROVIDER_VIEW: "PROVIDER.VIEW",
  PROVIDER_SWITCH: "PROVIDER.SWITCH",

  SETTINGS_VIEW: "SETTINGS.VIEW",
  SETTINGS_UPDATE: "SETTINGS.UPDATE",

  AUDIT_VIEW: "AUDIT.VIEW",

  NOTIFICATION_VIEW: "NOTIFICATION.VIEW",
});

const permissions = [
  {
    code: PERMISSION_CODES.DASHBOARD_VIEW,
    module: "DASHBOARD",
    action: "VIEW",
    name: "View Dashboard",
    description: "Allows access to the authorized dashboard.",
  },

  // User Management
  {
    code: PERMISSION_CODES.USER_CREATE,
    module: "USER",
    action: "CREATE",
    name: "Create Users",
    description: "Allows creation of permitted platform user categories.",
  },
  {
    code: PERMISSION_CODES.USER_VIEW,
    module: "USER",
    action: "VIEW",
    name: "View Users",
    description: "Allows viewing users within the permitted scope.",
  },
  {
    code: PERMISSION_CODES.USER_UPDATE,
    module: "USER",
    action: "UPDATE",
    name: "Update Users",
    description: "Allows updating user information.",
  },
  {
    code: PERMISSION_CODES.USER_ACTIVATE,
    module: "USER",
    action: "ACTIVATE",
    name: "Activate Users",
    description: "Allows activation of eligible user accounts.",
  },
  {
    code: PERMISSION_CODES.USER_DEACTIVATE,
    module: "USER",
    action: "DEACTIVATE",
    name: "Deactivate Users",
    description: "Allows user-account deactivation.",
  },
  {
    code: PERMISSION_CODES.USER_ASSIGN_ROLE,
    module: "USER",
    action: "ASSIGN_ROLE",
    name: "Assign User Roles",
    description: "Allows assignment of permitted roles to users.",
  },
  {
    code: PERMISSION_CODES.USER_RESET_PASSWORD,
    module: "USER",
    action: "RESET_PASSWORD",
    name: "Reset User Password",
    description: "Allows an administrator-triggered password-reset flow.",
  },

  // Roles and permissions
  {
    code: PERMISSION_CODES.ROLE_CREATE,
    module: "ROLE",
    action: "CREATE",
    name: "Create Roles",
    description: "Allows creation of custom roles.",
  },
  {
    code: PERMISSION_CODES.ROLE_VIEW,
    module: "ROLE",
    action: "VIEW",
    name: "View Roles",
    description: "Allows viewing roles and role configuration.",
  },
  {
    code: PERMISSION_CODES.ROLE_UPDATE,
    module: "ROLE",
    action: "UPDATE",
    name: "Update Roles",
    description: "Allows updating approved role fields.",
  },
  {
    code: PERMISSION_CODES.ROLE_ASSIGN_PERMISSION,
    module: "ROLE",
    action: "ASSIGN_PERMISSION",
    name: "Assign Role Permissions",
    description: "Allows assignment of existing permissions to roles.",
  },
  {
    code: PERMISSION_CODES.PERMISSION_VIEW,
    module: "PERMISSION",
    action: "VIEW",
    name: "View Permissions",
    description: "Allows viewing available system permissions.",
  },

  // Sessions
  {
    code: PERMISSION_CODES.SESSION_VIEW,
    module: "SESSION",
    action: "VIEW",
    name: "View Sessions",
    description: "Allows viewing permitted active sessions.",
  },
  {
    code: PERMISSION_CODES.SESSION_REVOKE,
    module: "SESSION",
    action: "REVOKE",
    name: "Revoke Sessions",
    description: "Allows revocation of permitted user sessions.",
  },

  // Distributor
  {
    code: PERMISSION_CODES.DISTRIBUTOR_CREATE,
    module: "DISTRIBUTOR",
    action: "CREATE",
    name: "Create Distributors",
    description: "Allows creation of distributor accounts.",
  },
  {
    code: PERMISSION_CODES.DISTRIBUTOR_VIEW,
    module: "DISTRIBUTOR",
    action: "VIEW",
    name: "View Distributors",
    description: "Allows viewing distributor profiles.",
  },
  {
    code: PERMISSION_CODES.DISTRIBUTOR_UPDATE,
    module: "DISTRIBUTOR",
    action: "UPDATE",
    name: "Update Distributors",
    description: "Allows updating distributor profiles.",
  },

  // Retailer
  {
    code: PERMISSION_CODES.RETAILER_CREATE,
    module: "RETAILER",
    action: "CREATE",
    name: "Create Retailers",
    description: "Allows creation of retailer accounts.",
  },
  {
    code: PERMISSION_CODES.RETAILER_VIEW,
    module: "RETAILER",
    action: "VIEW",
    name: "View Retailers",
    description: "Allows viewing retailers within the permitted scope.",
  },
  {
    code: PERMISSION_CODES.RETAILER_UPDATE,
    module: "RETAILER",
    action: "UPDATE",
    name: "Update Retailers",
    description: "Allows updating retailer profiles.",
  },
  {
    code: PERMISSION_CODES.RETAILER_ASSIGN_DISTRIBUTOR,
    module: "RETAILER",
    action: "ASSIGN_DISTRIBUTOR",
    name: "Assign Retailer Distributor",
    description: "Allows assigning or transferring a retailer.",
  },
  {
    code: PERMISSION_CODES.RETAILER_UPDATE_SERVICES,
    module: "RETAILER",
    action: "UPDATE_SERVICES",
    name: "Update Retailer Services",
    description: "Allows enabling or disabling retailer services.",
  },

  // Wallet and transactions
  {
    code: PERMISSION_CODES.WALLET_VIEW,
    module: "WALLET",
    action: "VIEW",
    name: "View Wallet",
    description: "Allows viewing permitted wallet information.",
  },
  {
    code: PERMISSION_CODES.TRANSACTION_VIEW,
    module: "TRANSACTION",
    action: "VIEW",
    name: "View Transactions",
    description: "Allows viewing permitted transactions.",
  },
  {
    code: PERMISSION_CODES.COMMISSION_VIEW,
    module: "COMMISSION",
    action: "VIEW",
    name: "View Commissions",
    description: "Allows viewing permitted commission information.",
  },

  // AEPS
  {
    code: PERMISSION_CODES.AEPS_WITHDRAW,
    module: "AEPS",
    action: "WITHDRAW",
    name: "AEPS Cash Withdrawal",
    description: "Allows performing an AEPS cash-withdrawal operation.",
  },
  {
    code: PERMISSION_CODES.AEPS_BALANCE_ENQUIRY,
    module: "AEPS",
    action: "BALANCE_ENQUIRY",
    name: "AEPS Balance Enquiry",
    description: "Allows performing an AEPS balance enquiry.",
  },
  {
    code: PERMISSION_CODES.AEPS_MINI_STATEMENT,
    module: "AEPS",
    action: "MINI_STATEMENT",
    name: "AEPS Mini Statement",
    description: "Allows retrieving an AEPS mini statement.",
  },

  // DMT
  {
    code: PERMISSION_CODES.DMT_CREATE,
    module: "DMT",
    action: "CREATE",
    name: "Create DMT Transaction",
    description: "Allows initiating a DMT transaction.",
  },
  {
    code: PERMISSION_CODES.DMT_VIEW,
    module: "DMT",
    action: "VIEW",
    name: "View DMT Transactions",
    description: "Allows viewing permitted DMT transactions.",
  },

  // Payout
  {
    code: PERMISSION_CODES.PAYOUT_CREATE,
    module: "PAYOUT",
    action: "CREATE",
    name: "Create Payout",
    description: "Allows initiating a payout.",
  },
  {
    code: PERMISSION_CODES.PAYOUT_VIEW,
    module: "PAYOUT",
    action: "VIEW",
    name: "View Payouts",
    description: "Allows viewing permitted payout records.",
  },

  // Reports
  {
    code: PERMISSION_CODES.REPORT_VIEW,
    module: "REPORT",
    action: "VIEW",
    name: "View Reports",
    description: "Allows viewing reports within the permitted scope.",
  },
  {
    code: PERMISSION_CODES.REPORT_EXPORT,
    module: "REPORT",
    action: "EXPORT",
    name: "Export Reports",
    description: "Allows exporting permitted reports.",
  },

  // Provider
  {
    code: PERMISSION_CODES.PROVIDER_VIEW,
    module: "PROVIDER",
    action: "VIEW",
    name: "View Providers",
    description: "Allows viewing provider configuration.",
  },
  {
    code: PERMISSION_CODES.PROVIDER_SWITCH,
    module: "PROVIDER",
    action: "SWITCH",
    name: "Switch Provider",
    description: "Allows switching the active provider where permitted.",
  },

  // Settings
  {
    code: PERMISSION_CODES.SETTINGS_VIEW,
    module: "SETTINGS",
    action: "VIEW",
    name: "View Settings",
    description: "Allows viewing platform settings.",
  },
  {
    code: PERMISSION_CODES.SETTINGS_UPDATE,
    module: "SETTINGS",
    action: "UPDATE",
    name: "Update Settings",
    description: "Allows updating approved platform settings.",
  },

  // Audit and notifications
  {
    code: PERMISSION_CODES.AUDIT_VIEW,
    module: "AUDIT",
    action: "VIEW",
    name: "View Audit Logs",
    description: "Allows viewing permitted audit records.",
  },
  {
    code: PERMISSION_CODES.NOTIFICATION_VIEW,
    module: "NOTIFICATION",
    action: "VIEW",
    name: "View Notifications",
    description: "Allows viewing account notifications.",
  },
];

export async function seedPermissions(prisma) {
  console.log("\n🛡️  Seeding permissions...");

  const seededPermissions = [];

  for (const permission of permissions) {
    const seededPermission = await prisma.permission.upsert({
      where: {
        code: permission.code,
      },

      update: {
        module: permission.module,
        action: permission.action,
        name: permission.name,
        description: permission.description,
        isActive: true,
        isSystem: true,
      },

      create: {
        ...permission,
        isActive: true,
        isSystem: true,
      },
    });

    seededPermissions.push(seededPermission);

    console.log(`   ✓ ${seededPermission.code}`);
  }

  return new Map(
    seededPermissions.map((permission) => [permission.code, permission]),
  );
}
