/*
  Warnings:

  - You are about to drop the column `usedAt` on the `PasswordResetToken` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `identities` table. All the data in the column will be lost.
  - Added the required column `first_name` to the `identities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `identities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assigned_by` to the `role_permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `role_permissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "usedAt";

-- AlterTable
ALTER TABLE "identities" DROP COLUMN "is_active",
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "role_permissions" ADD COLUMN     "assigned_by" UUID NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by" UUID;

-- CreateIndex
CREATE INDEX "role_permissions_assigned_by_idx" ON "role_permissions"("assigned_by");

-- CreateIndex
CREATE INDEX "role_permissions_updated_by_idx" ON "role_permissions"("updated_by");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
